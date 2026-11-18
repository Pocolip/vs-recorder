package com.yeskatronics.vs_recorder_backend.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.dto.PlanDTO;
import com.yeskatronics.vs_recorder_backend.dto.PlanResult;
import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import com.yeskatronics.vs_recorder_backend.dto.SimulationDTO;
import com.yeskatronics.vs_recorder_backend.engine.EngineProperties;
import com.yeskatronics.vs_recorder_backend.engine.WorkerStarter;
import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Kind;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Status;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationConflictException;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanRepository;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanTeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.SimulationJobRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService.TeamAccess;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Simulated Matchup Planner plans: for each planner entry (a {@link GamePlanTeam}), the
 * engine works out what the user should bring, what that team brings, and how the
 * matchup goes.
 *
 * Each entry is its own PLAN job, so results arrive entry by entry and a failed entry
 * fails alone. Jobs submitted together run back to back on one worker start, which is
 * why the worker is started once per submission. Polling is {@link SimulationService}'s,
 * shared with every kind of job.
 *
 * The user's own compositions are never touched: plans are served beside them.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PlanSimulationService {

    static final String DAILY_CAP = "daily_cap";
    static final String ENTRY_CHANGED = "entry_changed";
    static final String TEAM_CHANGED = "team_changed";
    static final String NO_TEAM_PASTE = "Your team needs a paste to simulate plans.";

    private final SimulationJobRepository jobRepository;
    private final UserRepository userRepository;
    private final TeamAccessService teamAccessService;
    private final GamePlanRepository gamePlanRepository;
    private final GamePlanTeamRepository gamePlanTeamRepository;
    private final PokepasteService pokepasteService;
    private final PasteNormalizer pasteNormalizer;
    private final SimulationService simulationService;
    private final EngineProperties properties;
    private final ObjectProvider<WorkerStarter> workerStarterProvider;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactions;

    // ==================== Submit ====================

    /**
     * Submit one plan job per requested entry, then start the worker once.
     *
     * Entries are judged one by one: one that's already running, up to date (unless
     * {@code force}), over the daily cap or unreadable gets an outcome saying so, and
     * the rest are queued. Problems with the whole request (not the owner, not
     * allowlisted, an unsupported regulation, the user's own paste) throw instead.
     *
     * As for simulations, network calls stay outside transactions: the pastes are
     * fetched first, the jobs committed, and only then pushed. Callers must not wrap
     * this in a transaction.
     */
    @Transactional(propagation = Propagation.SUPPORTS)
    public PlanDTO.SubmitResponse submit(Long teamId, Long userId, String username,
                                         List<Long> gamePlanTeamIds, boolean force) {
        simulationService.requireEnabled();
        List<Long> ids = gamePlanTeamIds == null ? List.of()
                : gamePlanTeamIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            throw new IllegalArgumentException("Choose at least one matchup team.");
        }

        // Fail fast, before fetching any paste.
        Submission submission = transactions.execute(tx -> {
            Team team = teamAccessService.requireOwner(teamId, userId).getTeam();
            if (!properties.isAllowed(username)) {
                throw new TeamAccessDeniedException("Simulations aren't available for this account yet");
            }
            String regulation = SimulationService.engineRegulation(team)
                    .orElseThrow(() -> new IllegalArgumentException(SimulationService.UNSUPPORTED_REGULATION));
            if (team.getPokepaste() == null || team.getPokepaste().isBlank()) {
                throw new IllegalArgumentException(NO_TEAM_PASTE);
            }
            Map<Long, String> entryPastes = new LinkedHashMap<>();
            Map<Long, GamePlanTeam> entries = entriesById(teamId);
            for (Long id : ids) {
                GamePlanTeam entry = entries.get(id);
                if (entry == null) {
                    throw new IllegalArgumentException("Matchup team not found in this team's planner");
                }
                entryPastes.put(id, entry.getPokepaste());
            }
            return new Submission(team.getPokepaste(), regulation, entryPastes);
        });

        // The user's team, as for a simulation: a problem here fails the whole request.
        PokepasteDTO.PasteData ourPaste = pokepasteService.fetchPasteData(submission.pasteUrl());
        if (ourPaste.getRawText() == null || ourPaste.getRawText().isBlank()) {
            throw new IllegalArgumentException("Couldn't read the team's paste.");
        }
        PreparedPaste ours = prepare(ourPaste.getRawText(), "Your team");

        // Each entry's team: a problem fails only that entry.
        Map<Long, PlanDTO.SubmitOutcome> outcomes = new LinkedHashMap<>();
        Map<Long, PreparedPaste> theirs = new LinkedHashMap<>();
        submission.entryPastes().forEach((id, pokepaste) -> {
            outcomes.put(id, null);
            try {
                theirs.put(id, prepare(opponentText(pokepaste), "Their team"));
            } catch (IllegalArgumentException e) {
                outcomes.put(id, refused(id, SimulationService.ERROR_INVALID_OPPONENT, e.getMessage()));
            }
        });

        List<Queued> queued = transactions.execute(tx -> {
            // One submit at a time per user, so the checks below can't race.
            userRepository.findByIdForUpdate(userId)
                    .orElseThrow(() -> new TeamAccessDeniedException("User not found"));
            Team team = teamAccessService.requireOwner(teamId, userId).getTeam();
            // The team's paste was fetched outside this transaction: if it changed
            // meanwhile, every plan in the batch would be stale from the start.
            if (!Objects.equals(team.getPokepaste(), submission.pasteUrl())) {
                throw new SimulationConflictException(TEAM_CHANGED,
                        "Your team's paste changed while submitting. Please try again.");
            }
            Map<Long, GamePlanTeam> entries = entriesById(teamId);
            String currentModel = currentModel();
            long left = properties.planDailyCap() - simulationService.jobsToday(userId, Kind.PLAN);

            List<Queued> jobs = new ArrayList<>();
            for (Map.Entry<Long, PreparedPaste> prepared : theirs.entrySet()) {
                Long id = prepared.getKey();
                PreparedPaste opponent = prepared.getValue();
                GamePlanTeam entry = entries.get(id);
                if (entry == null || !Objects.equals(entry.getPokepaste(), submission.entryPastes().get(id))) {
                    outcomes.put(id, refused(id, ENTRY_CHANGED,
                            "This matchup team changed while it was being submitted. Please try again."));
                    continue;
                }
                if (jobRepository.existsByGamePlanTeamIdAndStatusIn(id, SimulationJob.UNFINISHED)) {
                    outcomes.put(id, refused(id, SimulationConflictException.UNFINISHED,
                            "This team is already being simulated."));
                    continue;
                }
                if (!force && isUpToDate(id, ours.sha256(), opponent.sha256(), currentModel)) {
                    outcomes.put(id, refused(id, SimulationConflictException.UNCHANGED,
                            "Neither team has changed since this plan."));
                    continue;
                }
                if (left <= 0) {
                    outcomes.put(id, refused(id, DAILY_CAP, dailyCapMessage()));
                    continue;
                }
                left--;

                SimulationJob job = new SimulationJob();
                job.setId(UUID.randomUUID());
                job.setKind(Kind.PLAN);
                job.setTeam(team);
                job.setGamePlanTeam(entry);
                job.setRequestedBy(userId);
                job.setPasteUrl(submission.pasteUrl());
                job.setPasteSha256(ours.sha256());
                job.setOpponentPaste(entry.getPokepaste());
                job.setOpponentPasteSha256(opponent.sha256());
                job.setPasteNotes(joinNotes(ours.notes(), opponent.notes()));
                job.setStatus(Status.QUEUED);
                job.setLastChangedAt(Instant.now());
                jobs.add(new Queued(jobRepository.saveAndFlush(job).getId(), id, opponent.text()));
            }
            return jobs;
        });

        int pushed = 0;
        for (Queued job : queued) {
            try {
                simulationService.queue().submit(jobJson(job.jobId(), submission.regulation(), ours.text(), job.opponentText()));
                outcomes.put(job.entryId(), PlanDTO.SubmitOutcome.builder().gamePlanTeamId(job.entryId()).queued(true).build());
                pushed++;
            } catch (RuntimeException e) {
                simulationService.recordQueueFailure(job.jobId(), e);
                outcomes.put(job.entryId(), refused(job.entryId(), SimulationService.ERROR_QUEUE_UNAVAILABLE,
                        SimulationService.QUEUE_UNAVAILABLE));
            }
        }
        if (pushed > 0) {
            log.info("Submitted {} plan job(s) for team {}", pushed, teamId);
            // Once for the batch: queued jobs run back to back on one worker start.
            workerStarterProvider.ifAvailable(WorkerStarter::start);
        }

        PlanDTO.StatusResponse status = transactions.execute(tx ->
                buildStatus(teamAccessService.resolve(teamId, userId), username, userId));
        return PlanDTO.SubmitResponse.builder()
                .outcomes(List.copyOf(outcomes.values()))
                .status(status)
                .build();
    }

    private record Submission(String pasteUrl, String regulation, Map<Long, String> entryPastes) {}

    private record PreparedPaste(String text, String sha256, List<String> notes) {}

    private record Queued(UUID jobId, Long entryId, String opponentText) {}

    /** Normalized as for simulations (Mega formes); hashed as sent. */
    private PreparedPaste prepare(String rawText, String whose) {
        PasteNormalizer.Result cleaned = pasteNormalizer.normalize(rawText);
        List<String> notes = cleaned.notes().stream().map(note -> whose + ": " + note).toList();
        return new PreparedPaste(cleaned.text(), SimulationService.sha256(cleaned.text()), notes);
    }

    /**
     * An entry's {@code pokepaste} is a paste URL, or inline sheet text (Recent Tour's
     * open teamsheets). Text is sent as it is; a URL is fetched.
     */
    private String opponentText(String pokepaste) {
        if (pokepaste == null || pokepaste.isBlank()) {
            throw new IllegalArgumentException("This team has no paste.");
        }
        if (isInlinePaste(pokepaste)) {
            return pokepaste;
        }
        try {
            String text = pokepasteService.fetchPasteData(pokepaste.trim()).getRawText();
            if (text == null || text.isBlank()) {
                throw new IllegalArgumentException("empty");
            }
            return text;
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("Couldn't read this team's paste.");
        }
    }

    /** As {@code pokepasteService.isInlinePaste} in the frontend: several lines, not a link. */
    static boolean isInlinePaste(String pokepaste) {
        String trimmed = pokepaste.trim();
        return !trimmed.regionMatches(true, 0, "http", 0, 4) && trimmed.contains("\n");
    }

    /** The entry's latest complete plan used these exact pastes, and the model hasn't changed since. */
    private boolean isUpToDate(Long entryId, String pasteSha256, String opponentSha256, String currentModel) {
        return jobRepository.findFirstByGamePlanTeamIdAndStatusOrderByCreatedAtDesc(entryId, Status.COMPLETE)
                .filter(latest -> pasteSha256.equals(latest.getPasteSha256()))
                .filter(latest -> opponentSha256.equals(latest.getOpponentPasteSha256()))
                .filter(latest -> !isNewerModel(currentModel, latest))
                .isPresent();
    }

    private static PlanDTO.SubmitOutcome refused(Long entryId, String code, String message) {
        return PlanDTO.SubmitOutcome.builder()
                .gamePlanTeamId(entryId)
                .queued(false)
                .errorCode(code)
                .message(message)
                .build();
    }

    private static String joinNotes(List<String> ours, List<String> theirs) {
        List<String> all = new ArrayList<>(ours);
        all.addAll(theirs);
        return all.isEmpty() ? null : String.join("\n", all);
    }

    private String jobJson(UUID jobId, String regulation, String teamPaste, String opponentPaste) {
        Map<String, Object> job = new LinkedHashMap<>();
        job.put("schema_version", 1);
        job.put("job_id", jobId.toString());
        job.put("kind", "plan");
        job.put("regulation", regulation);
        job.put("team_paste", teamPaste);
        job.put("opponent_paste", opponentPaste);
        try {
            return objectMapper.writeValueAsString(job);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Couldn't serialize plan job", e);
        }
    }

    // ==================== Status and cancel ====================

    public PlanDTO.StatusResponse getStatus(Long teamId, Long userId, String username) {
        return buildStatus(teamAccessService.resolve(teamId, userId), username, userId);
    }

    /**
     * Ask the engine to stop the entry's unfinished plan. It stays unfinished until the
     * engine confirms. Takes the job's row lock, like polling.
     */
    @Transactional
    public PlanDTO.StatusResponse cancel(Long teamId, Long gamePlanTeamId, Long userId, String username) {
        simulationService.requireEnabled();
        TeamAccess access = teamAccessService.requireOwner(teamId, userId);
        if (!entriesById(teamId).containsKey(gamePlanTeamId)) {
            throw new IllegalArgumentException("Matchup team not found in this team's planner");
        }
        jobRepository.findIdsByGamePlanTeamNewestFirst(gamePlanTeamId, PageRequest.of(0, 1)).stream().findFirst()
                .flatMap(jobRepository::findByIdForUpdate)
                .filter(SimulationJob::isUnfinished)
                .filter(job -> !job.isCancelRequested())
                .ifPresent(job -> {
                    simulationService.queue().cancel(job.getId().toString());
                    job.setCancelRequested(true);
                    log.info("Requested cancellation of plan job {}", job.getId());
                });
        return buildStatus(access, username, userId);
    }

    private PlanDTO.StatusResponse buildStatus(TeamAccess access, String username, Long userId) {
        if (!properties.enabled()) {
            return PlanDTO.StatusResponse.builder().enabled(false).entries(List.of()).build();
        }
        Team team = access.getTeam();
        List<GamePlanTeam> entries = entriesOf(team.getId());
        Map<Long, List<SimulationJob>> jobsByEntry = entries.isEmpty() ? Map.of()
                : jobRepository.findByGamePlanTeamIdInOrderByCreatedAtDesc(
                                entries.stream().map(GamePlanTeam::getId).toList()).stream()
                        .collect(Collectors.groupingBy(job -> job.getGamePlanTeam().getId(),
                                LinkedHashMap::new, Collectors.toList()));
        String currentModel = currentModel();

        boolean canRun = false;
        String blockedReason = null;
        Integer runsLeftToday = null;
        if (access.isOwner() && properties.isAllowed(username)) {
            runsLeftToday = (int) Math.max(0, properties.planDailyCap() - simulationService.jobsToday(userId, Kind.PLAN));
            if (SimulationService.engineRegulation(team).isEmpty()) {
                blockedReason = SimulationService.UNSUPPORTED_REGULATION;
            } else if (team.getPokepaste() == null || team.getPokepaste().isBlank()) {
                blockedReason = NO_TEAM_PASTE;
            } else if (runsLeftToday == 0) {
                blockedReason = dailyCapMessage();
            } else {
                canRun = true;
            }
        }

        List<PlanDTO.EntryStatus> statuses = entries.stream().map(entry -> {
            List<SimulationJob> jobs = jobsByEntry.getOrDefault(entry.getId(), List.of());
            SimulationJob latest = jobs.isEmpty() ? null : jobs.get(0);
            PlanDTO.PlanInfo result = shownPlanJob(team, entry, jobs, currentModel)
                    .map(job -> toPlanInfo(team, entry, job, currentModel))
                    .orElse(null);
            return PlanDTO.EntryStatus.builder()
                    .gamePlanTeamId(entry.getId())
                    .job(latest == null ? null : toJobInfo(latest))
                    .result(result)
                    .build();
        }).toList();

        return PlanDTO.StatusResponse.builder()
                .enabled(true)
                .canRun(canRun)
                .runBlockedReason(blockedReason)
                .runsLeftToday(runsLeftToday)
                .entries(statuses)
                .build();
    }

    /**
     * The plan an entry shows: its latest complete one while it's current (same pastes
     * and model), otherwise its latest with any result. A re-run that hasn't finished,
     * or stopped after its picks arrived, never hides a complete plan that still holds.
     *
     * @param jobs the entry's jobs, newest first
     */
    static Optional<SimulationJob> shownPlanJob(Team team, GamePlanTeam entry, List<SimulationJob> jobs,
                                                String currentModel) {
        return jobs.stream()
                .filter(job -> job.getStatus() == Status.COMPLETE && job.getResult() != null)
                .findFirst()
                .filter(job -> staleReason(team, entry, job, currentModel) == null)
                .or(() -> jobs.stream().filter(job -> job.getResult() != null).findFirst());
    }

    private static SimulationDTO.JobInfo toJobInfo(SimulationJob job) {
        return SimulationDTO.JobInfo.builder()
                .id(job.getId())
                .status(job.getStatus().name())
                .pasteNotes(job.getPasteNotes() == null ? List.of() : List.of(job.getPasteNotes().split("\n")))
                .progress(job.getProgress())
                .unfinished(job.isUnfinished())
                .cancelRequested(job.isCancelRequested())
                .errorCode(job.getErrorCode())
                .errorMessage(job.getErrorMessage())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }

    private PlanDTO.PlanInfo toPlanInfo(Team team, GamePlanTeam entry, SimulationJob job, String currentModel) {
        PlanResult result = parse(job);
        PlanDTO.StaleReason staleReason = staleReason(team, entry, job, currentModel);
        PlanResult.Preview preview = result.getPreview();
        return PlanDTO.PlanInfo.builder()
                .jobId(job.getId())
                .status(result.getStatus())
                .stale(staleReason != null)
                .staleReason(staleReason)
                .compositions(result.getCompositions())
                .opponentCompositions(result.getOpponentCompositions())
                .opponentSummary(result.getOpponentSummary())
                .games(result.getGames())
                .wins(result.getWins())
                .losses(result.getLosses())
                .ties(result.getTies())
                .winRate(result.getWinRate())
                .ci95(result.getCi95())
                .category(result.getCategory())
                .previewValue(preview != null ? preview.getValue() : null)
                .simplifyCost(preview != null && preview.getSimplifyCost() != null
                        ? preview.getSimplifyCost().getVsBestResponse() : null)
                .opponentSpreads(result.getOpponent() != null ? result.getOpponent().getSpreads() : null)
                .createdAt(job.getUpdatedAt())
                .build();
    }

    /**
     * A plan is stale when the user's paste, the entry's paste or the engine's model
     * changed since. The pastes are compared as stored (a URL, or the entry's inline
     * text), so nothing is fetched.
     */
    static PlanDTO.StaleReason staleReason(Team team, GamePlanTeam entry, SimulationJob job, String currentModel) {
        if (!Objects.equals(team.getPokepaste(), job.getPasteUrl())) {
            return PlanDTO.StaleReason.TEAM;
        }
        if (!Objects.equals(entry.getPokepaste(), job.getOpponentPaste())) {
            return PlanDTO.StaleReason.OPPONENT;
        }
        if (isNewerModel(currentModel, job)) {
            return PlanDTO.StaleReason.MODEL;
        }
        return null;
    }

    private static boolean isNewerModel(String currentModel, SimulationJob job) {
        return currentModel != null && job.getModel() != null && !currentModel.equals(job.getModel());
    }

    /** The model of the latest complete job of any kind: what the engine runs now, as far as we know. */
    private String currentModel() {
        return jobRepository.findFirstByStatusAndModelIsNotNullOrderByLastChangedAtDesc(Status.COMPLETE)
                .map(SimulationJob::getModel)
                .orElse(null);
    }

    private PlanResult parse(SimulationJob job) {
        try {
            return objectMapper.readValue(job.getResult(), PlanResult.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored result of plan job " + job.getId() + " is unreadable", e);
        }
    }

    // ==================== Helpers ====================

    /** The team's planner entries in the planner's order; empty when it has no planner yet. */
    private List<GamePlanTeam> entriesOf(Long teamId) {
        return gamePlanRepository.findFirstByTeamId(teamId)
                .map(plan -> gamePlanTeamRepository.findByGamePlanIdOrderByPositionAscIdAsc(plan.getId()))
                .orElse(List.of());
    }

    private Map<Long, GamePlanTeam> entriesById(Long teamId) {
        return entriesOf(teamId).stream()
                .collect(Collectors.toMap(GamePlanTeam::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
    }

    private String dailyCapMessage() {
        return "You've reached today's limit of " + properties.planDailyCap() + " simulated plans.";
    }
}
