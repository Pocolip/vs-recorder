package com.yeskatronics.vs_recorder_backend.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.yeskatronics.vs_recorder_backend.dto.PlanDTO;
import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import com.yeskatronics.vs_recorder_backend.entities.GamePlan;
import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Kind;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Status;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanRepository;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanTeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.SimulationJobRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamCollaboratorRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.services.GamePlanService;
import com.yeskatronics.vs_recorder_backend.services.PlanSimulationService;
import com.yeskatronics.vs_recorder_backend.services.PokepasteService;
import com.yeskatronics.vs_recorder_backend.services.SimulationService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Simulated Matchup Planner plans end to end, with the queue, the worker and the
 * paste fetch mocked: a batch submit, then the poller through partial and complete.
 */
@SpringBootTest(properties = {
        "engine.enabled=true",
        "engine.allowed-users=plan-owner, plan-collab",
        "engine.daily-cap=1",
        "engine.plan-daily-cap=4",
        "engine.poll-initial-delay=PT24H"
})
@Transactional
class PlanSimulationFlowTest {

    private static final String TEAM_URL = "https://pokepast.es/rain1";
    private static final String TEAM_PASTE = "Pelipper @ Damp Rock\nAbility: Drizzle\n- Hurricane\n";
    private static final String OPPONENT_URL = "https://pokepast.es/frankfurt";
    private static final String OPPONENT_PASTE = "Garchomp @ Choice Scarf\nAbility: Rough Skin\n- Earthquake\n";
    private static final String INLINE_SHEET = "Gholdengo @ Choice Specs\nAbility: Good as Gold\n- Make It Rain\n\n"
            + "Incineroar @ Sitrus Berry\nAbility: Intimidate\n- Fake Out\n";

    private static String completeJson;
    private static String partialJson;

    @MockitoBean private EngineQueue queue;
    @MockitoBean private WorkerStarter workerStarter;
    @MockitoBean private PokepasteService pokepasteService;

    @Autowired private PlanSimulationService planService;
    @Autowired private SimulationService simulationService;
    @Autowired private GamePlanService gamePlanService;
    @Autowired private SimulationPoller poller;
    @Autowired private SimulationJobRepository jobRepository;
    @Autowired private TeamRepository teamRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TeamCollaboratorRepository collaboratorRepository;
    @Autowired private GamePlanRepository gamePlanRepository;
    @Autowired private GamePlanTeamRepository gamePlanTeamRepository;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private EntityManager entityManager;

    private User owner;
    private User collaborator;
    private Team team;
    private GamePlan plan;
    private GamePlanTeam byUrl;
    private GamePlanTeam inline;

    @BeforeAll
    static void loadFixture() throws Exception {
        try (InputStream in = PlanSimulationFlowTest.class.getResourceAsStream(PlanResultContractTest.FIXTURE)) {
            completeJson = new String(Objects.requireNonNull(in).readAllBytes(), StandardCharsets.UTF_8);
        }
        // What the worker publishes after the preview: everything but the games' outcome.
        ObjectNode partial = (ObjectNode) new ObjectMapper().readTree(completeJson);
        partial.put("status", "partial");
        partial.remove(List.of("games", "wins", "losses", "ties", "winRate", "ci95", "category"));
        partialJson = partial.toString();
    }

    @BeforeEach
    void setUp() {
        owner = saveUser("plan-owner");
        collaborator = saveUser("plan-collab");

        team = new Team();
        team.setUser(owner);
        team.setName("Rain");
        team.setPokepaste(TEAM_URL);
        team.setRegulation("VGC 2026 Regulation M-C");
        team = teamRepository.save(team);

        TeamCollaborator membership = new TeamCollaborator();
        membership.setTeam(team);
        membership.setUser(collaborator);
        membership.setInviteEmail(collaborator.getEmail());
        membership.setStatus(TeamCollaborator.Status.ACCEPTED);
        membership.setInviteExpiresAt(LocalDateTime.now().plusDays(7));
        collaboratorRepository.save(membership);

        plan = new GamePlan();
        plan.setUser(owner);
        plan.setTeamId(team.getId());
        plan.setName("Opponent Plans");
        plan = gamePlanRepository.save(plan);
        byUrl = saveEntry(plan, OPPONENT_URL, 0);
        inline = saveEntry(plan, INLINE_SHEET, 1);

        pasteAt(TEAM_URL, TEAM_PASTE);
        pasteAt(OPPONENT_URL, OPPONENT_PASTE);
    }

    // ==================== Submit ====================

    @Test
    void aBatchQueuesOneJobPerEntryAndStartsTheWorkerOnce() throws Exception {
        PlanDTO.SubmitResponse response = submit(false, byUrl, inline);

        assertTrue(response.getOutcomes().stream().allMatch(PlanDTO.SubmitOutcome::isQueued));
        assertEquals(List.of(byUrl.getId(), inline.getId()),
                response.getOutcomes().stream().map(PlanDTO.SubmitOutcome::getGamePlanTeamId).toList());

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(queue, times(2)).submit(json.capture());
        verify(workerStarter, times(1)).start();

        JsonNode first = objectMapper.readTree(json.getAllValues().get(0));
        assertEquals(Set.of("schema_version", "job_id", "kind", "regulation", "team_paste", "opponent_paste"),
                fieldNames(first));
        assertEquals(1, first.get("schema_version").asInt());
        assertEquals("plan", first.get("kind").asText());
        assertEquals("gen9championsvgc2026regmc", first.get("regulation").asText());
        assertEquals(TEAM_PASTE, first.get("team_paste").asText());
        // A URL is resolved first...
        assertEquals(OPPONENT_PASTE, first.get("opponent_paste").asText());
        verify(pokepasteService).fetchPasteData(OPPONENT_URL);
        // ...and inline sheet text is sent as it is
        assertEquals(INLINE_SHEET, objectMapper.readTree(json.getAllValues().get(1)).get("opponent_paste").asText());

        PlanDTO.EntryStatus entry = entryStatus(response.getStatus(), byUrl);
        assertEquals("QUEUED", entry.getJob().getStatus());
        assertTrue(entry.getJob().isUnfinished());
        assertNull(entry.getJob().getDepth());
        assertNull(entry.getResult());
        // In line in the order queued: the second waits for the first.
        PlanDTO.EntryStatus second = entryStatus(response.getStatus(), inline);
        assertEquals(0, entry.getJob().getJobsAhead());
        assertEquals(1, second.getJob().getJobsAhead());
        assertTrue(second.getJob().getStartsInMinutes() > entry.getJob().getStartsInMinutes());
        assertEquals(2, response.getStatus().getQueue().getJobsAhead());

        SimulationJob saved = jobRepository.findById(entry.getJob().getId()).orElseThrow();
        assertEquals(Kind.PLAN, saved.getKind());
        assertEquals(byUrl.getId(), saved.getGamePlanTeam().getId());
        assertEquals(64, saved.getOpponentPasteSha256().length());
        assertEquals(OPPONENT_URL, saved.getOpponentPaste());
    }

    @Test
    void plansDontTouchTheSimulatedAnalytics() {
        submit(false, byUrl, inline);
        var simulate = simulationService.getStatus(team.getId(), owner.getId(), "plan-owner");
        assertNull(simulate.getJob(), "plan jobs aren't the team's simulation");
        assertTrue(simulate.isCanRun(), "nor do they use its daily cap");
        assertEquals(1, simulate.getRunsLeftToday());
    }

    @Test
    void oneUnfinishedPlanPerEntry() {
        submit(false, byUrl);
        clearInvocations(queue, workerStarter);

        PlanDTO.SubmitResponse again = submit(true, byUrl, inline);
        assertFalse(outcome(again, byUrl).isQueued());
        assertEquals("simulation_unfinished", outcome(again, byUrl).getErrorCode());
        assertTrue(outcome(again, inline).isQueued());
        verify(queue, times(1)).submit(anyString());
    }

    @Test
    void anUpToDatePlanIsOnlyReRunWhenForced() {
        finishWith(latestJobId(byUrl), completeJson);
        clearInvocations(queue, workerStarter);

        PlanDTO.SubmitResponse unchanged = submit(false, byUrl);
        assertEquals("simulation_unchanged", outcome(unchanged, byUrl).getErrorCode());
        verify(queue, never()).submit(anyString());
        verify(workerStarter, never()).start();

        assertTrue(outcome(submit(true, byUrl), byUrl).isQueued());
    }

    @Test
    void theDailyCapCountsEachEntry() {
        GamePlanTeam third = saveEntry(plan, INLINE_SHEET + "\n", 2);
        GamePlanTeam fourth = saveEntry(plan, INLINE_SHEET + "\n\n", 3);
        GamePlanTeam fifth = saveEntry(plan, INLINE_SHEET + "\n\n\n", 4);
        submit(false, byUrl);

        PlanDTO.SubmitResponse response = submit(false, inline, third, fourth, fifth);
        assertTrue(outcome(response, inline).isQueued());
        assertTrue(outcome(response, third).isQueued());
        assertTrue(outcome(response, fourth).isQueued());
        assertEquals("daily_cap", outcome(response, fifth).getErrorCode());
        assertEquals(0, response.getStatus().getRunsLeftToday());
        assertFalse(response.getStatus().isCanRun());
    }

    @Test
    void anUnreadableEntryFailsAlone() {
        when(pokepasteService.fetchPasteData(OPPONENT_URL)).thenThrow(new IllegalArgumentException("404"));

        PlanDTO.SubmitResponse response = submit(false, byUrl, inline);
        assertEquals("invalid_opponent", outcome(response, byUrl).getErrorCode());
        assertEquals("Couldn't read this team's paste.", outcome(response, byUrl).getMessage());
        assertTrue(outcome(response, inline).isQueued());
        verify(queue, times(1)).submit(anyString());
    }

    @Test
    void aMegaFormeInTheOpponentsPasteIsNormalized() throws Exception {
        GamePlanTeam mega = saveEntry(plan, "Garchomp-Mega @ Garchompite\nAbility: Rough Skin\n\nIncineroar\n- Fake Out\n", 2);
        PlanDTO.SubmitResponse response = submit(false, mega);

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(queue).submit(json.capture());
        assertTrue(objectMapper.readTree(json.getValue()).get("opponent_paste").asText().startsWith("Garchomp @ Garchompite"));
        assertEquals(List.of("Their team: Garchomp-Mega was sent as Garchomp holding Garchompite."),
                entryStatus(response.getStatus(), mega).getJob().getPasteNotes());
    }

    @Test
    void aTeamPasteChangedMidSubmitQueuesNothing() {
        // The owner saves a new paste while the old one is being fetched
        when(pokepasteService.fetchPasteData(TEAM_URL)).thenAnswer(invocation -> {
            team.setPokepaste("https://pokepast.es/rain2");
            teamRepository.saveAndFlush(team);
            PokepasteDTO.PasteData paste = new PokepasteDTO.PasteData();
            paste.setRawText(TEAM_PASTE);
            return paste;
        });
        var e = assertThrows(com.yeskatronics.vs_recorder_backend.exceptions.SimulationConflictException.class,
                () -> submit(false, byUrl));
        assertEquals("team_changed", e.getCode());
        verify(queue, never()).submit(anyString());
        assertTrue(jobRepository.findAll().isEmpty());
    }

    @Test
    void submitIsOwnerAndAllowlistOnlyAndCollaboratorsCanView() {
        assertThrows(TeamAccessDeniedException.class, () -> planService.submit(
                team.getId(), collaborator.getId(), "plan-collab", List.of(byUrl.getId()), false));

        PlanDTO.StatusResponse viewed = planService.getStatus(team.getId(), collaborator.getId(), "plan-collab");
        assertTrue(viewed.isEnabled());
        assertFalse(viewed.isCanRun());
        assertNull(viewed.getRunsLeftToday());
        assertEquals(2, viewed.getEntries().size());
        verify(queue, never()).submit(anyString());
    }

    @Test
    void entriesMustBelongToTheTeamsPlanner() {
        User other = saveUser("plan-other");
        Team othersTeam = new Team();
        othersTeam.setUser(other);
        othersTeam.setName("Other");
        othersTeam.setPokepaste("https://pokepast.es/other");
        othersTeam.setRegulation("VGC 2026 Regulation M-C");
        othersTeam = teamRepository.save(othersTeam);
        GamePlan othersPlan = new GamePlan();
        othersPlan.setUser(other);
        othersPlan.setTeamId(othersTeam.getId());
        othersPlan.setName("Theirs");
        othersPlan = gamePlanRepository.save(othersPlan);
        GamePlanTeam theirs = saveEntry(othersPlan, OPPONENT_URL, 0);

        assertThrows(IllegalArgumentException.class, () -> submit(false, theirs));
        verify(queue, never()).submit(anyString());
    }

    @Test
    void otherRegulationsAreRefused() {
        team.setRegulation("VGC 2026 Regulation M-B");
        assertThrows(IllegalArgumentException.class, () -> submit(false, byUrl));
        PlanDTO.StatusResponse status = planService.getStatus(team.getId(), owner.getId(), "plan-owner");
        assertFalse(status.isCanRun());
        assertNotNull(status.getRunBlockedReason());
    }

    // ==================== Poller and results ====================

    @Test
    void aPartialShowsTheCompositionsWithTheWinRatePending() {
        UUID id = latestJobId(byUrl);
        String key = id.toString();
        when(queue.jobState(key)).thenReturn(Map.of("status", "running", "progress", "preview 1/1", "partial", "1"));
        when(queue.partial(key)).thenReturn(Optional.of(partialJson));
        poller.poll();

        PlanDTO.EntryStatus entry = entryStatus(status(), byUrl);
        assertEquals("PARTIAL", entry.getJob().getStatus());
        assertEquals("preview 1/1", entry.getJob().getProgress());
        PlanDTO.PlanInfo result = entry.getResult();
        assertEquals("partial", result.getStatus());
        assertEquals(3, result.getCompositions().size());
        assertEquals(2, result.getOpponentCompositions().size());
        assertNotNull(result.getOpponentSummary());
        assertNull(result.getWinRate());
        assertNull(result.getCategory());
        assertNull(result.getGames());
        assertFalse(result.isStale());
    }

    @Test
    void aCompletePlanIsServedBesideTheUsersOwnCompositions() throws Exception {
        GamePlanTeam.TeamComposition own = new GamePlanTeam.TeamComposition(
                "Pelipper", "Archaludon", "Golisopod", "Sneasler", "My own plan");
        byUrl.addComposition(own);
        gamePlanTeamRepository.saveAndFlush(byUrl);

        UUID id = latestJobId(byUrl);
        finishWith(id, completeJson);

        SimulationJob job = jobRepository.findById(id).orElseThrow();
        assertEquals(Status.COMPLETE, job.getStatus());
        assertEquals("run26-latest-7b58dee0", job.getModel());
        assertEquals(Set.of("model", "created"), fieldNames(objectMapper.readTree(job.getResult()).get("provenance")));
        verify(queue).cleanup(id.toString());

        PlanDTO.PlanInfo result = entryStatus(status(), byUrl).getResult();
        assertEquals("complete", result.getStatus());
        assertEquals(0.6797, result.getWinRate(), 1e-9);
        assertEquals(List.of(0.5914, 0.768), result.getCi95());
        assertEquals("favorable", result.getCategory());
        assertEquals(128, result.getGames());
        assertEquals(87, result.getWins());
        assertEquals(0.4025, result.getCompositions().get(0).getWeight(), 1e-9);
        assertEquals(0.1364, result.getSimplifyCost(), 1e-9);
        assertEquals(0.7264, result.getPreviewValue(), 1e-9);
        assertEquals("sheet", result.getOpponentSpreads());

        // The user's own compositions are untouched
        entityManager.flush();
        entityManager.clear();
        assertEquals(List.of(own), gamePlanTeamRepository.findById(byUrl.getId()).orElseThrow().getCompositions());
        assertNull(entryStatus(status(), inline).getResult(), "results are per entry");
    }

    @Test
    void anInvalidOpponentShowsTheEnginesMessage() {
        UUID id = latestJobId(byUrl);
        finishWith(id, failedJson(id, "invalid_opponent", "the team isn't valid: a team has 6 Pokémon, this one 4"));

        PlanDTO.EntryStatus entry = entryStatus(status(), byUrl);
        assertEquals("FAILED", entry.getJob().getStatus());
        assertEquals("invalid_opponent", entry.getJob().getErrorCode());
        assertEquals("the team isn't valid: a team has 6 Pokémon, this one 4", entry.getJob().getErrorMessage());
    }

    @Test
    void aPlanGoesStaleWhenEitherPasteChanges() {
        finishWith(latestJobId(byUrl), completeJson);
        assertFalse(entryStatus(status(), byUrl).getResult().isStale());

        byUrl.setPokepaste("https://pokepast.es/frankfurt2");
        gamePlanTeamRepository.saveAndFlush(byUrl);
        PlanDTO.PlanInfo result = entryStatus(status(), byUrl).getResult();
        assertTrue(result.isStale());
        assertEquals(PlanDTO.StaleReason.OPPONENT, result.getStaleReason());

        team.setPokepaste("https://pokepast.es/rain2");
        teamRepository.saveAndFlush(team);
        assertEquals(PlanDTO.StaleReason.TEAM, entryStatus(status(), byUrl).getResult().getStaleReason());
    }

    @Test
    void aPlanGoesStaleWhenTheEngineRunsANewerModel() {
        finishWith(latestJobId(byUrl), completeJson);
        finishWith(latestJobId(inline), completeJson.replace("run26-latest-7b58dee0", "run27-latest-00000000"));

        PlanDTO.PlanInfo old = entryStatus(status(), byUrl).getResult();
        assertTrue(old.isStale());
        assertEquals(PlanDTO.StaleReason.MODEL, old.getStaleReason());
        assertFalse(entryStatus(status(), inline).getResult().isStale());

        // ...and is no longer "up to date", so it re-runs without force
        clearInvocations(queue);
        assertTrue(outcome(submit(false, byUrl), byUrl).isQueued());
    }

    @Test
    void cancelIsPerEntryAndWaitsForTheEngine() {
        UUID id = latestJobId(byUrl);
        submit(false, inline);

        PlanDTO.StatusResponse status = planService.cancel(team.getId(), byUrl.getId(), owner.getId(), "plan-owner");
        verify(queue).cancel(id.toString());
        verify(queue, times(1)).cancel(anyString());
        assertTrue(entryStatus(status, byUrl).getJob().isCancelRequested());
        assertFalse(entryStatus(status, inline).getJob().isCancelRequested());

        assertThrows(TeamAccessDeniedException.class,
                () -> planService.cancel(team.getId(), byUrl.getId(), collaborator.getId(), "plan-collab"));

        finishWith(id, failedJson(id, "cancelled", "cancelled"));
        assertEquals("CANCELLED", entryStatus(status(), byUrl).getJob().getStatus());
    }

    @Test
    void aDeletedEntrysJobIsCancelledCleanedAndLaterPurged() {
        UUID id = latestJobId(byUrl);

        entityManager.flush();
        entityManager.clear();
        gamePlanService.deleteGamePlanTeam(byUrl.getId(), plan.getId(), owner.getId());
        entityManager.flush();
        entityManager.clear();
        SimulationJob orphan = jobRepository.findById(id).orElseThrow();
        assertNull(orphan.getGamePlanTeam(), "the job outlives its entry (ON DELETE SET NULL)");
        assertNotNull(orphan.getTeam());

        poller.poll();
        verify(queue).cancel(id.toString());
        finishWith(id, failedJson(id, "cancelled", "cancelled"));
        verify(queue).cleanup(id.toString());
        assertTrue(jobRepository.findById(id).isPresent(), "kept for now: today's cap counts it");

        simulationService.purgeOrphanedJobs(Instant.now().plus(Duration.ofDays(3)));
        assertTrue(jobRepository.findById(id).isEmpty());
        assertEquals(1, status().getEntries().size());
    }

    @Test
    void aReRunThatStopsAfterItsPicksKeepsShowingTheCompletePlan() {
        UUID first = latestJobId(byUrl);
        finishWith(first, completeJson);

        PlanDTO.SubmitResponse resubmitted = submit(true, byUrl);
        assertTrue(outcome(resubmitted, byUrl).isQueued());
        UUID rerun = entryStatus(resubmitted.getStatus(), byUrl).getJob().getId();
        String key = rerun.toString();
        when(queue.jobState(key)).thenReturn(Map.of("status", "running", "progress", "preview 1/1", "partial", "1"));
        when(queue.partial(key)).thenReturn(Optional.of(partialJson));
        poller.poll();

        // While it runs, the complete plan stays, win rate and all
        PlanDTO.EntryStatus during = entryStatus(status(), byUrl);
        assertEquals("PARTIAL", during.getJob().getStatus());
        assertEquals(first, during.getResult().getJobId());
        assertNotNull(during.getResult().getWinRate());

        // Cancelled after its picks: still the complete plan
        finishWith(rerun, failedJson(rerun, "cancelled", "cancelled"));
        PlanDTO.EntryStatus after = entryStatus(status(), byUrl);
        assertEquals("CANCELLED", after.getJob().getStatus());
        assertEquals(first, after.getResult().getJobId());
        assertEquals("complete", after.getResult().getStatus());
    }

    @Test
    void aStoppedReRunForAChangedOpponentShowsItsPicks() {
        UUID first = latestJobId(byUrl);
        finishWith(first, completeJson);
        String edited = "https://pokepast.es/frankfurt-edited";
        pasteAt(edited, "Kingambit @ Black Glasses\nAbility: Defiant\n- Kowtow Cleave\n");
        byUrl.setPokepaste(edited);
        gamePlanTeamRepository.save(byUrl);

        UUID rerun = latestJobId(byUrl);
        when(queue.partial(rerun.toString())).thenReturn(Optional.of(partialJson));
        finishWith(rerun, failedJson(rerun, "cancelled", "cancelled"));

        PlanDTO.PlanInfo result = entryStatus(status(), byUrl).getResult();
        assertEquals(rerun, result.getJobId());
        assertEquals("partial", result.getStatus());
        assertFalse(result.isStale());
    }

    // ==================== Helpers ====================

    private PlanDTO.SubmitResponse submit(boolean force, GamePlanTeam... entries) {
        return planService.submit(team.getId(), owner.getId(), "plan-owner",
                Arrays.stream(entries).map(GamePlanTeam::getId).toList(), force);
    }

    /** Submits the entry and returns its job's id. */
    private UUID latestJobId(GamePlanTeam entry) {
        PlanDTO.SubmitResponse response = submit(false, entry);
        assertTrue(outcome(response, entry).isQueued(), () -> outcome(response, entry).getMessage());
        return entryStatus(response.getStatus(), entry).getJob().getId();
    }

    private PlanDTO.StatusResponse status() {
        return planService.getStatus(team.getId(), owner.getId(), "plan-owner");
    }

    private void finishWith(UUID id, String resultJson) {
        when(queue.result(id.toString())).thenReturn(Optional.of(resultJson));
        poller.poll();
    }

    private static PlanDTO.EntryStatus entryStatus(PlanDTO.StatusResponse status, GamePlanTeam entry) {
        return status.getEntries().stream()
                .filter(e -> e.getGamePlanTeamId().equals(entry.getId()))
                .findFirst().orElseThrow();
    }

    private static PlanDTO.SubmitOutcome outcome(PlanDTO.SubmitResponse response, GamePlanTeam entry) {
        return response.getOutcomes().stream()
                .filter(o -> o.getGamePlanTeamId().equals(entry.getId()))
                .findFirst().orElseThrow();
    }

    private void pasteAt(String url, String text) {
        PokepasteDTO.PasteData paste = new PokepasteDTO.PasteData();
        paste.setRawText(text);
        when(pokepasteService.fetchPasteData(url)).thenReturn(paste);
    }

    private GamePlanTeam saveEntry(GamePlan gamePlan, String pokepaste, int position) {
        GamePlanTeam entry = new GamePlanTeam();
        entry.setGamePlan(gamePlan);
        entry.setPokepaste(pokepaste);
        entry.setPosition(position);
        return gamePlanTeamRepository.save(entry);
    }

    private static String failedJson(UUID id, String code, String message) {
        return """
                {"schema_version":1,"kind":"plan","job_id":"%s","regulation":"gen9championsvgc2026regmc",
                 "status":"failed","error":{"code":"%s","message":"%s"}}
                """.formatted(id, code, message);
    }

    private static Set<String> fieldNames(JsonNode node) {
        Set<String> names = new HashSet<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }

    private User saveUser(String username) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(username + "@example.com");
        u.setPasswordHash("hashed_password");
        return userRepository.save(u);
    }
}
