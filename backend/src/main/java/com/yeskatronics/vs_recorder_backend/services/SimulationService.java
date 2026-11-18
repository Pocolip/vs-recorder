package com.yeskatronics.vs_recorder_backend.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.yeskatronics.vs_recorder_backend.dto.AnalyticsDTO;
import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import com.yeskatronics.vs_recorder_backend.dto.SimulationDTO;
import com.yeskatronics.vs_recorder_backend.dto.SimulationResult;
import com.yeskatronics.vs_recorder_backend.engine.EngineProperties;
import com.yeskatronics.vs_recorder_backend.engine.EngineQueue;
import com.yeskatronics.vs_recorder_backend.engine.WorkerStarter;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Depth;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Kind;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Status;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.exceptions.RateLimitExceededException;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationConflictException;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationNotFoundException;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationUnavailableException;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import com.yeskatronics.vs_recorder_backend.repositories.SimulationJobRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.services.AnalyticsService.CustomMatchupTracker;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService.TeamAccess;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

/**
 * A team's matchup engine simulation: submitting and cancelling jobs, following them
 * on the queue, and serving their results to the analytics pages.
 *
 * Results are only numbers in VS Recorder's own analytics shapes, so the "Simulated"
 * pages are the real pages fed from a stored result instead of replays.
 *
 * Polling covers every kind of job; Matchup Planner plans are submitted and served by
 * {@link PlanSimulationService}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SimulationService {

    /** VS Recorder regulation name -> the engine's regulation ID. Only what the engine supports. */
    static final Map<String, String> ENGINE_REGULATIONS = Map.of(
            "VGC 2026 Regulation M-C", "gen9championsvgc2026regmc"
    );

    static final String GENERIC_FAILURE = "The simulation failed on our side. Please try again later.";
    static final String UNSUPPORTED_REGULATION = "Simulations only support VGC 2026 Regulation M-C for now.";

    static final String ERROR_INVALID_TEAM = "invalid_team";
    static final String ERROR_INVALID_OPPONENT = "invalid_opponent";
    private static final String ERROR_CANCELLED = "cancelled";
    private static final String ERROR_INTERNAL = "internal";
    private static final String ERROR_TIMEOUT = "timeout";
    static final String ERROR_QUEUE_UNAVAILABLE = "queue_unavailable";
    static final String QUEUE_UNAVAILABLE = "Simulations are unavailable right now. Please try again later.";

    /** How long the worker is still woken for a job being reconciled. */
    static final Duration RECONCILE_WAKE_WINDOW = Duration.ofHours(6);
    /** How long finished jobs of deleted teams are kept (the daily cap counts them). */
    static final Duration ORPHAN_RETENTION = Duration.ofDays(2);

    private final SimulationJobRepository jobRepository;
    private final UserRepository userRepository;
    private final TeamAccessService teamAccessService;
    private final PokepasteService pokepasteService;
    private final PasteNormalizer pasteNormalizer;
    private final AnalyticsService analyticsService;
    private final EngineProperties properties;
    private final ObjectProvider<EngineQueue> queueProvider;
    private final ObjectProvider<WorkerStarter> workerStarterProvider;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactions;

    // ==================== Jobs ====================

    /**
     * Submit a simulation of the team's current paste.
     *
     * Network calls stay outside database transactions: the paste is fetched first,
     * the job is committed, and only then pushed to the queue. If the push fails the
     * job is marked failed; if the process dies before it, the job never ran and
     * times out. Either way nothing runs on the engine that this backend won't follow.
     *
     * Runs without a transaction of its own (each step opens one). It joins the
     * caller's when there is one, as in tests, so callers must not wrap it in a
     * transaction: the commit-before-push order depends on it. The controller doesn't.
     *
     * @param depth how much the engine plays (QUICK or FULL)
     * @param force re-run even if the latest complete result used the same paste at
     *              this depth or deeper
     */
    @Transactional(propagation = Propagation.SUPPORTS)
    public SimulationDTO.StatusResponse submit(Long teamId, Long userId, String username, Depth depth, boolean force) {
        requireEnabled();

        // Fail fast, before fetching the paste.
        Submission submission = transactions.execute(tx -> {
            Team team = teamAccessService.requireOwner(teamId, userId).getTeam();
            if (!properties.isAllowed(username)) {
                throw new TeamAccessDeniedException("Simulations aren't available for this account yet");
            }
            String regulation = engineRegulation(team)
                    .orElseThrow(() -> new IllegalArgumentException(UNSUPPORTED_REGULATION));
            return new Submission(team.getPokepaste(), regulation);
        });

        PokepasteDTO.PasteData paste = pokepasteService.fetchPasteData(submission.pasteUrl());
        String rawPaste = paste.getRawText();
        if (rawPaste == null || rawPaste.isBlank()) {
            throw new IllegalArgumentException("Couldn't read the team's paste.");
        }
        // Mega formes become the species they evolve from (400 if a stone is missing),
        // so the user's paste needn't change. Hashed as sent, so "unchanged" compares
        // what the engine saw.
        PasteNormalizer.Result cleaned = pasteNormalizer.normalize(rawPaste);
        String pasteText = cleaned.text();
        String pasteNotes = cleaned.notes().isEmpty() ? null : String.join("\n", cleaned.notes());
        String pasteSha256 = sha256(pasteText);

        UUID jobId = transactions.execute(tx -> {
            // One submit at a time per user, so the checks below can't race.
            userRepository.findByIdForUpdate(userId)
                    .orElseThrow(() -> new TeamAccessDeniedException("User not found"));
            Team team = teamAccessService.requireOwner(teamId, userId).getTeam();

            if (jobRepository.existsByTeamIdAndKindAndStatusIn(teamId, Kind.SIMULATE, SimulationJob.UNFINISHED)) {
                throw new SimulationConflictException(SimulationConflictException.UNFINISHED,
                        "A simulation for this team is already running.");
            }
            if (!force) {
                jobRepository.findFirstByTeamIdAndKindAndStatusOrderByCreatedAtDesc(teamId, Kind.SIMULATE, Status.COMPLETE)
                        .filter(latest -> pasteSha256.equals(latest.getPasteSha256()))
                        .filter(latest -> latest.getDepth().covers(depth))
                        .ifPresent(latest -> {
                            throw new SimulationConflictException(SimulationConflictException.UNCHANGED,
                                    latest.getDepth() == depth
                                            ? "This team hasn't changed since its last simulation."
                                            : "This team already has a full simulation of its current paste.");
                        });
            }
            if (jobsToday(userId) >= properties.dailyCap()) {
                throw new RateLimitExceededException(dailyCapMessage());
            }

            SimulationJob job = new SimulationJob();
            job.setId(UUID.randomUUID());
            job.setKind(Kind.SIMULATE);
            job.setTeam(team);
            job.setRequestedBy(userId);
            job.setPasteUrl(submission.pasteUrl());
            job.setPasteSha256(pasteSha256);
            job.setStatus(Status.QUEUED);
            job.setDepth(depth);
            job.setPasteNotes(pasteNotes);
            job.setLastChangedAt(Instant.now());
            return jobRepository.saveAndFlush(job).getId();
        });

        try {
            queue().submit(jobJson(jobId, submission.regulation(), pasteText, depth));
        } catch (RuntimeException e) {
            recordQueueFailure(jobId, e);
            throw new SimulationUnavailableException(QUEUE_UNAVAILABLE, e);
        }
        log.info("Submitted {} simulation job {} for team {}", depth, jobId, teamId);

        workerStarterProvider.ifAvailable(WorkerStarter::start);

        return transactions.execute(tx -> buildStatus(teamAccessService.resolve(teamId, userId), username, userId));
    }

    private record Submission(String pasteUrl, String regulation) {}

    /**
     * A committed job couldn't be pushed. The push may have landed even though it
     * reported failure, so the job isn't abandoned: reconciliation keeps it cancelled
     * until a worker is done with it. Runs in a transaction of its own.
     */
    void recordQueueFailure(UUID jobId, RuntimeException cause) {
        log.error("Couldn't queue simulation job {}: {}", jobId, cause.getClass().getSimpleName());
        transactions.executeWithoutResult(tx -> jobRepository.findByIdForUpdate(jobId).ifPresent(job -> {
            job.setStatus(Status.FAILED);
            job.setErrorCode(ERROR_QUEUE_UNAVAILABLE);
            job.setErrorMessage(QUEUE_UNAVAILABLE);
            job.setLastChangedAt(Instant.now());
            job.setReconcilePending(true);
        }));
    }

    public SimulationDTO.StatusResponse getStatus(Long teamId, Long userId, String username) {
        TeamAccess access = teamAccessService.resolve(teamId, userId);
        return buildStatus(access, username, userId);
    }

    /**
     * Ask the engine to stop the team's unfinished job. The job stays unfinished until
     * the engine confirms, which can take a few minutes.
     *
     * Takes the job's row lock, like polling, so the cancel key can't be written after
     * the job has finished and been cleaned up.
     */
    @Transactional
    public SimulationDTO.StatusResponse cancel(Long teamId, Long userId, String username) {
        requireEnabled();
        TeamAccess access = teamAccessService.requireOwner(teamId, userId);
        // Only the id first: the job itself must first be read under the lock, or this
        // persistence context would hand back a stale copy.
        jobRepository.findIdsByTeamNewestFirst(teamId, Kind.SIMULATE, PageRequest.of(0, 1)).stream().findFirst()
                .flatMap(jobRepository::findByIdForUpdate)
                .filter(SimulationJob::isUnfinished)
                .filter(job -> !job.isCancelRequested())
                .ifPresent(job -> {
                    queue().cancel(job.getId().toString());
                    job.setCancelRequested(true);
                    log.info("Requested cancellation of simulation job {}", job.getId());
                });
        return buildStatus(access, username, userId);
    }

    // ==================== Simulated analytics ====================

    public AnalyticsDTO.UsageStatsResponse getSimulatedUsageStats(Long teamId) {
        return latestMetrics(teamId).getUsageStats();
    }

    public AnalyticsDTO.MatchupStatsResponse getSimulatedMatchupStats(Long teamId) {
        return latestMetrics(teamId).getMatchupStats();
    }

    public AnalyticsDTO.MoveUsageResponse getSimulatedMoveUsage(Long teamId) {
        return latestMetrics(teamId).getMoveUsage();
    }

    /**
     * {@link AnalyticsService#getCustomMatchupAnalysis} over the simulated opponents.
     *
     * It only needs each game's opposing team and result, and every game against an
     * opponent row had the same six, so a row's games are added at once.
     */
    public AnalyticsDTO.CustomMatchupResponse getSimulatedCustomMatchup(
            Long teamId, AnalyticsDTO.CustomMatchupRequest request) {

        SimulationResult result = latestResult(teamId).result();
        Set<String> core = request.getOpponentPokemon().stream()
                .map(analyticsService::normalizeForAnalytics)
                .collect(Collectors.toSet());

        Map<String, CustomMatchupTracker> trackers = new HashMap<>();
        int anyMatchCount = 0;
        int anyMatchWins = 0;
        int exactMatchCount = 0;

        for (SimulationResult.OpponentRow row : result.getOpponents()) {
            Set<String> species = row.getSpecies().stream()
                    .map(analyticsService::normalizeForAnalytics)
                    .collect(Collectors.toSet());

            boolean hadAny = false;
            for (String pokemon : core) {
                if (species.contains(pokemon)) {
                    hadAny = true;
                    CustomMatchupTracker tracker = trackers.computeIfAbsent(pokemon, k -> new CustomMatchupTracker());
                    tracker.gamesAgainst += row.getGames();
                    tracker.winsAgainst += row.getWins();
                }
            }
            if (hadAny) {
                anyMatchCount += row.getGames();
                anyMatchWins += row.getWins();
            }
            if (species.containsAll(core)) {
                exactMatchCount += row.getGames();
            }
        }

        return AnalyticsService.buildCustomMatchupResponse(trackers, anyMatchCount, anyMatchWins, exactMatchCount);
    }

    public SimulationDTO.DiagnosticsResponse getDiagnostics(Long teamId, Long userId) {
        TeamAccess access = teamAccessService.resolve(teamId, userId);
        StoredResult stored = latestResult(teamId);
        SimulationResult.Diagnostics diagnostics = stored.result().getDiagnostics();
        if (diagnostics == null) {
            throw new SimulationNotFoundException("This simulation has no diagnostics");
        }
        Comparator<SimulationResult.Threat> worstFirst = Comparator
                .comparing(SimulationResult.Threat::getDelta, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(SimulationResult.Threat::getGames, Comparator.reverseOrder());

        return SimulationDTO.DiagnosticsResponse.builder()
                .resultStatus(stored.result().getStatus())
                .stale(isStale(access.getTeam(), stored.job()))
                .opponentsCount(stored.result().getOpponents().size())
                .games(diagnostics.getGames())
                .winRate(diagnostics.getWinRate())
                .members(diagnostics.getMembers())
                .threatSpecies(diagnostics.getThreats().getSpecies().stream().sorted(worstFirst).toList())
                .threatPairs(diagnostics.getThreats().getPairs().stream().sorted(worstFirst).toList())
                .build();
    }

    // ==================== Polling (SimulationPoller) ====================

    /** The outcome of polling one job. */
    public enum PollOutcome { OK, QUEUE_ERROR }

    public List<UUID> unfinishedJobIds() {
        return jobRepository.findIdsByStatusIn(SimulationJob.UNFINISHED);
    }

    public boolean hasUnfinishedJobs() {
        return jobRepository.existsByStatusIn(SimulationJob.UNFINISHED);
    }

    public List<UUID> cleanupPendingJobIds() {
        return jobRepository.findIdsByCleanupPendingTrue();
    }

    public List<UUID> reconcilePendingJobIds() {
        return jobRepository.findIdsByReconcilePendingTrue();
    }

    @Transactional
    public void markCleanedUp(UUID jobId) {
        jobRepository.findById(jobId).ifPresent(job -> job.setCleanupPending(false));
    }

    /**
     * Delete finished jobs whose team was deleted, once their Redis keys are gone.
     * They stay a couple of days first, because the daily cap counts them.
     */
    @Transactional
    public int purgeOrphanedJobs(Instant now) {
        return jobRepository.deleteOrphaned(SimulationJob.UNFINISHED, Kind.PLAN, now.minus(ORPHAN_RETENTION));
    }

    /**
     * Bring one unfinished job up to date from the queue:
     * <ol>
     *   <li>a final result finishes it (complete, failed or cancelled);</li>
     *   <li>otherwise a first partial result is saved and the job is PARTIAL;</li>
     *   <li>otherwise its status and progress are copied (no state yet means queued).</li>
     * </ol>
     * A job with no change for the stale timeout is failed, even while the queue is
     * unreachable. A finished job is marked for clean-up, which the poller does after
     * this transaction commits.
     *
     * @return QUEUE_ERROR if the queue couldn't be read, so the poller can log once per tick
     */
    @Transactional
    public PollOutcome pollJob(UUID jobId, Instant now) {
        SimulationJob job = jobRepository.findByIdForUpdate(jobId).orElse(null);
        if (job == null || !job.isUnfinished()) {
            return PollOutcome.OK;
        }

        boolean changed;
        PollOutcome outcome = PollOutcome.OK;
        try {
            changed = syncFromQueue(job, now);
        } catch (RuntimeException e) {
            log.debug("Couldn't read simulation job {} from the queue: {}", jobId, e.toString());
            changed = false;
            outcome = PollOutcome.QUEUE_ERROR;
        }

        if (!job.isUnfinished()) {
            return outcome;
        }
        if (changed) {
            job.setLastChangedAt(now);
        } else if (job.getLastChangedAt().plus(properties.staleTimeout()).isBefore(now)) {
            log.warn("Simulation job {} made no progress for {}; marking it failed", jobId, properties.staleTimeout());
            job.setStatus(Status.FAILED);
            job.setErrorCode(ERROR_TIMEOUT);
            job.setErrorMessage(GENERIC_FAILURE);
            job.setLastChangedAt(now);
            // A worker may still claim it: keep it cancelled until it's safe to clean up.
            job.setReconcilePending(true);
        }
        return outcome;
    }

    /** @return whether the job's status or progress changed (or it finished) */
    private boolean syncFromQueue(SimulationJob job, Instant now) {
        EngineQueue queue = queue();
        String id = job.getId().toString();

        // The team (or the plan's entry) was deleted: nobody will look at this job, so
        // stop the engine early.
        boolean orphaned = job.getTeam() == null
                || (job.getKind() == Kind.PLAN && job.getGamePlanTeam() == null);
        if (orphaned && !job.isCancelRequested()) {
            queue.cancel(id);
            job.setCancelRequested(true);
        }

        // Every read happens before any change, so a failed read can't half-apply one.
        Optional<String> finalResult = queue.result(id);
        if (finalResult.isPresent()) {
            // A partial published between polls is still usable if the job then fails.
            Optional<String> partial = job.getResult() == null ? queue.partial(id) : Optional.empty();
            finish(job, finalResult.get(), partial, now);
            return true;
        }

        Map<String, String> state = queue.jobState(id);
        if ("1".equals(state.get("partial")) && job.getResult() == null) {
            applyPartial(job, queue.partial(id));
        }

        Status next = nextStatus(job, state.get("status"));
        boolean changed = false;
        if (next != job.getStatus()) {
            job.setStatus(next);
            changed = true;
        }
        String progress = state.get("progress");
        if (progress != null && !progress.equals(job.getProgress())) {
            job.setProgress(progress.length() > 100 ? progress.substring(0, 100) : progress);
            changed = true;
        }
        return changed;
    }

    /**
     * A job we gave up on (a timeout, or a push that may or may not have landed) that a
     * worker may still claim. It stays cancelled in Redis, so a worker that claims it
     * stops at once and publishes a "cancelled" result; then it's cleaned up.
     *
     * It's followed until that result appears, however long that takes: queued
     * messages never expire on the engine's side, so there's no safe point to stop.
     * That costs one GET per tick per such job, and they're rare.
     */
    @Transactional
    public void reconcileJob(UUID jobId, Instant now) {
        SimulationJob job = jobRepository.findByIdForUpdate(jobId).orElse(null);
        if (job == null || !job.isReconcilePending()) {
            return;
        }
        EngineQueue queue = queue();
        String id = jobId.toString();
        if (!job.isCancelRequested()) {
            queue.cancel(id);
            job.setCancelRequested(true);
        }
        if (queue.result(id).isPresent()) {
            job.setReconcilePending(false);
            job.setCleanupPending(true);
        }
    }

    /**
     * Whether the worker should be running: for unfinished jobs, and for a while for
     * jobs being reconciled, so a queued message gets claimed and acknowledges its cancel.
     */
    public boolean needsWorker(Instant now) {
        return jobRepository.existsByStatusIn(SimulationJob.UNFINISHED)
                || jobRepository.existsByReconcilePendingTrueAndLastChangedAtAfter(now.minus(RECONCILE_WAKE_WINDOW));
    }

    /** Save a partial result that was read from the queue, if it's readable. */
    private void applyPartial(SimulationJob job, Optional<String> partialJson) {
        partialJson.ifPresent(partial -> {
            try {
                job.setResult(sanitize(partial));
            } catch (JsonProcessingException e) {
                log.error("Unreadable partial result for simulation job {}: {}", job.getId(), e.getOriginalMessage());
            }
        });
    }

    /**
     * The hash's status can go back to {@code queued} after {@code running} (a retry or
     * a worker shutting down); that's not a failure. Once a job has a partial result it
     * stays PARTIAL until it finishes.
     */
    private static Status nextStatus(SimulationJob job, String queueStatus) {
        if (job.getResult() != null) {
            return Status.PARTIAL;
        }
        if (queueStatus == null || "queued".equals(queueStatus)) {
            return Status.QUEUED;
        }
        if ("running".equals(queueStatus)) {
            return Status.RUNNING;
        }
        // complete/failed/cancelled in the hash: the result is on its way.
        return job.getStatus();
    }

    private void finish(SimulationJob job, String resultJson, Optional<String> partialJson, Instant now) {
        String id = job.getId().toString();
        job.setCleanupPending(true);
        job.setLastChangedAt(now);

        SimulationResult result;
        try {
            result = objectMapper.readValue(resultJson, SimulationResult.class);
        } catch (JsonProcessingException e) {
            log.error("Unreadable result for simulation job {}: {}", id, e.getOriginalMessage());
            fail(job, ERROR_INTERNAL, null);
            return;
        }

        if (SimulationResult.STATUS_COMPLETE.equals(result.getStatus())) {
            try {
                job.setResult(sanitize(resultJson));
                job.setStatus(Status.COMPLETE);
                job.setModel(modelOf(result));
                log.info("Simulation job {} complete", id);
            } catch (JsonProcessingException e) {
                log.error("Unreadable result for simulation job {}: {}", id, e.getOriginalMessage());
                fail(job, ERROR_INTERNAL, null);
            }
            return;
        }

        // Keep a partial published between polls before clean-up deletes it.
        if (job.getResult() == null) {
            applyPartial(job, partialJson);
        }

        SimulationResult.Error error = result.getError();
        String code = error != null && error.getCode() != null ? error.getCode() : ERROR_INTERNAL;
        String message = error != null ? error.getMessage() : null;
        if (!SimulationResult.STATUS_FAILED.equals(result.getStatus())) {
            log.error("Simulation job {} published an unexpected status: {}", id, result.getStatus());
            code = ERROR_INTERNAL;
        }

        if (ERROR_CANCELLED.equals(code)) {
            job.setStatus(Status.CANCELLED);
            job.setErrorCode(code);
            log.info("Simulation job {} cancelled", id);
            return;
        }
        if (ERROR_INVALID_TEAM.equals(code) || ERROR_INVALID_OPPONENT.equals(code)) {
            log.info("Simulation job {} rejected a team ({}): {}", id, code, message);
        } else {
            log.error("Simulation job {} failed: {} {}", id, code, message);
        }
        fail(job, code, message);
    }

    /**
     * Keeps any partial result: it's still usable. The engine's message is shown only
     * when it's about a team the user can fix.
     */
    private static void fail(SimulationJob job, String code, String engineMessage) {
        job.setStatus(Status.FAILED);
        job.setErrorCode(code);
        boolean aboutATeam = ERROR_INVALID_TEAM.equals(code) || ERROR_INVALID_OPPONENT.equals(code);
        job.setErrorMessage(aboutATeam
                ? (engineMessage != null && !engineMessage.isBlank() ? engineMessage : "The team isn't valid.")
                : GENERIC_FAILURE);
    }

    private static String modelOf(SimulationResult result) {
        String model = result.getProvenance() != null ? result.getProvenance().getModel() : null;
        if (model == null || model.isBlank()) {
            return null;
        }
        return model.length() > 100 ? model.substring(0, 100) : model;
    }

    // ==================== Helpers ====================

    private SimulationDTO.StatusResponse buildStatus(TeamAccess access, String username, Long userId) {
        if (!properties.enabled()) {
            return SimulationDTO.StatusResponse.builder().enabled(false).build();
        }
        Team team = access.getTeam();
        Optional<SimulationJob> latest = jobRepository.findFirstByTeamIdAndKindOrderByCreatedAtDesc(team.getId(), Kind.SIMULATE);
        Optional<SimulationJob> withResult = shownResultJob(team.getId());

        boolean canRun = false;
        String blockedReason = null;
        Integer runsLeftToday = null;
        if (access.isOwner() && properties.isAllowed(username)) {
            runsLeftToday = (int) Math.max(0, properties.dailyCap() - jobsToday(userId));
            if (engineRegulation(team).isEmpty()) {
                blockedReason = UNSUPPORTED_REGULATION;
            } else if (latest.map(SimulationJob::isUnfinished).orElse(false)) {
                blockedReason = null; // the UI shows the running job instead
            } else if (runsLeftToday == 0) {
                blockedReason = dailyCapMessage();
            } else {
                canRun = true;
            }
        }

        return SimulationDTO.StatusResponse.builder()
                .enabled(true)
                .canRun(canRun)
                .runBlockedReason(blockedReason)
                .runsLeftToday(runsLeftToday)
                .job(latest.map(SimulationService::toJobInfo).orElse(null))
                .result(withResult.map(job -> toResultInfo(team, job)).orElse(null))
                .build();
    }

    private static SimulationDTO.JobInfo toJobInfo(SimulationJob job) {
        return SimulationDTO.JobInfo.builder()
                .id(job.getId())
                .status(job.getStatus().name())
                .depth(depthName(job))
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

    private SimulationDTO.ResultInfo toResultInfo(Team team, SimulationJob job) {
        SimulationResult result = parse(job);
        int totalGames = result.getMetrics() != null && result.getMetrics().getUsageStats() != null
                ? result.getMetrics().getUsageStats().getTotalGames()
                : 0;
        // Games and wins against each opposing Pokémon; a row's games all had the same six.
        Map<String, SimulationDTO.OpponentPokemon> byPokemon = new TreeMap<>();
        for (SimulationResult.OpponentRow row : result.getOpponents()) {
            Set<String> species = row.getSpecies().stream()
                    .map(analyticsService::normalizeForAnalytics)
                    .collect(Collectors.toSet());
            for (String pokemon : species) {
                SimulationDTO.OpponentPokemon entry = byPokemon.computeIfAbsent(pokemon,
                        k -> new SimulationDTO.OpponentPokemon(k, 0, 0));
                entry.setGamesAgainst(entry.getGamesAgainst() + row.getGames());
                entry.setWinsAgainst(entry.getWinsAgainst() + row.getWins());
            }
        }
        return SimulationDTO.ResultInfo.builder()
                .jobId(job.getId())
                .status(result.getStatus())
                .depth(depthName(job))
                .stale(isStale(team, job))
                .opponentsCount(result.getOpponents().size())
                .totalGames(totalGames)
                .opponentPokemon(List.copyOf(byPokemon.values()))
                .createdAt(job.getUpdatedAt())
                .build();
    }

    /** The paste is a URL; a different one means the team changed since the job. */
    private static boolean isStale(Team team, SimulationJob job) {
        return !Objects.equals(team.getPokepaste(), job.getPasteUrl());
    }

    private SimulationResult.Metrics latestMetrics(Long teamId) {
        SimulationResult.Metrics metrics = latestResult(teamId).result().getMetrics();
        if (metrics == null) {
            throw new SimulationNotFoundException("This simulation has no analytics");
        }
        return metrics;
    }

    private record StoredResult(SimulationJob job, SimulationResult result) {}

    private StoredResult latestResult(Long teamId) {
        if (!properties.enabled()) {
            throw new SimulationNotFoundException("Simulations are not enabled");
        }
        SimulationJob job = shownResultJob(teamId)
                .orElseThrow(() -> new SimulationNotFoundException("This team has no simulation result yet"));
        return new StoredResult(job, parse(job));
    }

    /**
     * The job whose result the pages show: the latest complete one while the team's
     * paste is still the one it ran, otherwise the latest with any result (a partial,
     * or one kept from a run that failed or was cancelled after it). So a re-run that
     * hasn't finished, or stopped early, never hides a complete result for the same
     * paste, and the status and every simulated page agree on which result it is.
     */
    private Optional<SimulationJob> shownResultJob(Long teamId) {
        return jobRepository.findFirstByTeamIdAndKindAndStatusOrderByCreatedAtDesc(teamId, Kind.SIMULATE, Status.COMPLETE)
                .filter(job -> job.getResult() != null && job.getTeam() != null && !isStale(job.getTeam(), job))
                .or(() -> jobRepository.findFirstByTeamIdAndKindAndResultIsNotNullOrderByCreatedAtDesc(teamId, Kind.SIMULATE));
    }

    private SimulationResult parse(SimulationJob job) {
        try {
            return objectMapper.readValue(job.getResult(), SimulationResult.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored result of simulation job " + job.getId() + " is unreadable", e);
        }
    }

    /**
     * The stored copy of a result keeps only {@code provenance.model} and
     * {@code provenance.created}; the rest of the provenance is the engine's business.
     */
    String sanitize(String resultJson) throws JsonProcessingException {
        JsonNode root = objectMapper.readTree(resultJson);
        if (root instanceof ObjectNode object && object.get("provenance") instanceof ObjectNode provenance) {
            provenance.retain("model", "created");
        }
        return objectMapper.writeValueAsString(root);
    }

    /** "quick" or "full"; null for a plan, which has no depth. */
    private static String depthName(SimulationJob job) {
        Depth depth = job.getDepth();
        return depth == null ? null : depth.name().toLowerCase(java.util.Locale.ROOT);
    }

    private String jobJson(UUID jobId, String regulation, String pasteText, Depth depth) {
        Map<String, Object> job = new LinkedHashMap<>();
        job.put("schema_version", 1);
        job.put("job_id", jobId.toString());
        job.put("kind", "simulate");
        job.put("regulation", regulation);
        job.put("team_paste", pasteText);
        if (depth == Depth.QUICK) {
            // No careful games for the best-placed opponents; FULL takes the engine's defaults.
            job.put("options", Map.of("search_opponents", 0));
        }
        try {
            return objectMapper.writeValueAsString(job);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Couldn't serialize simulation job", e);
        }
    }

    static Optional<String> engineRegulation(Team team) {
        return Optional.ofNullable(team.getRegulation()).map(ENGINE_REGULATIONS::get);
    }

    private long jobsToday(Long userId) {
        return jobsToday(userId, Kind.SIMULATE);
    }

    /** Jobs of a kind the user submitted today (UTC): each kind has its own daily cap. */
    long jobsToday(Long userId, Kind kind) {
        Instant startOfDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
        return jobRepository.countByRequestedByAndKindAndCreatedAtAfter(userId, kind, startOfDay);
    }

    private String dailyCapMessage() {
        return "You've reached today's limit of " + properties.dailyCap() + " simulations.";
    }

    void requireEnabled() {
        if (!properties.enabled()) {
            throw new TeamAccessDeniedException("Simulations are not enabled");
        }
    }

    EngineQueue queue() {
        EngineQueue queue = queueProvider.getIfAvailable();
        if (queue == null) {
            throw new IllegalStateException("Engine queue is not configured");
        }
        return queue;
    }

    static String sha256(String text) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
