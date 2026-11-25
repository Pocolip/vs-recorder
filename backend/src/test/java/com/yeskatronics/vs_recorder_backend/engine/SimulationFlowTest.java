package com.yeskatronics.vs_recorder_backend.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.dto.AnalyticsDTO;
import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import com.yeskatronics.vs_recorder_backend.dto.SimulationDTO;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Depth;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Status;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.exceptions.RateLimitExceededException;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationConflictException;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationNotFoundException;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationUnavailableException;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import com.yeskatronics.vs_recorder_backend.repositories.SimulationJobRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamCollaboratorRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.services.PokepasteService;
import com.yeskatronics.vs_recorder_backend.services.SimulationService;
import com.yeskatronics.vs_recorder_backend.services.TeamService;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import jakarta.persistence.EntityManager;
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
 * A simulation job end to end, with the queue, the worker and the paste fetch mocked:
 * submit, then the poller through queued, running, partial and a final result.
 *
 * The poller's schedule is pushed out of the way; tests call {@link SimulationPoller#poll()}.
 */
@SpringBootTest(properties = {
        "engine.enabled=true",
        "engine.allowed-users=sim-owner, sim-collab",
        "engine.daily-cap=2",
        "engine.poll-initial-delay=PT24H"
})
@Transactional
class SimulationFlowTest {

    private static final String PASTE = "Pelipper @ Damp Rock\nAbility: Drizzle\n- Hurricane\n";
    private static String completeJson;
    private static String partialJson;

    @MockitoBean private EngineQueue queue;
    @MockitoBean private WorkerStarter workerStarter;
    @MockitoBean private PokepasteService pokepasteService;

    @Autowired private SimulationService simulationService;
    @Autowired private SimulationPoller poller;
    @Autowired private SimulationJobRepository jobRepository;
    @Autowired private TeamRepository teamRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TeamCollaboratorRepository collaboratorRepository;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private EntityManager entityManager;
    @Autowired private TeamService teamService;

    private User owner;
    private User collaborator;
    private Team team;

    @BeforeAll
    static void loadFixture() throws Exception {
        try (InputStream in = SimulationFlowTest.class.getResourceAsStream(SimulationResultContractTest.FIXTURE)) {
            completeJson = new String(Objects.requireNonNull(in).readAllBytes(), StandardCharsets.UTF_8);
        }
        partialJson = completeJson.replaceFirst("\"status\":\\s*\"complete\"", "\"status\": \"partial\"");
        assertNotEquals(completeJson, partialJson);
    }

    @BeforeEach
    void setUp() {
        owner = saveUser("sim-owner");
        collaborator = saveUser("sim-collab");

        team = new Team();
        team.setUser(owner);
        team.setName("Rain");
        team.setPokepaste("https://pokepast.es/rain1");
        team.setRegulation("VGC 2026 Regulation M-C");
        team = teamRepository.save(team);

        TeamCollaborator membership = new TeamCollaborator();
        membership.setTeam(team);
        membership.setUser(collaborator);
        membership.setInviteEmail(collaborator.getEmail());
        membership.setStatus(TeamCollaborator.Status.ACCEPTED);
        membership.setInviteExpiresAt(LocalDateTime.now().plusDays(7));
        collaboratorRepository.save(membership);

        PokepasteDTO.PasteData paste = new PokepasteDTO.PasteData();
        paste.setRawText(PASTE);
        when(pokepasteService.fetchPasteData(anyString())).thenReturn(paste);
    }

    // ==================== Submit ====================

    @Test
    void submitQueuesTheJobAndStartsTheWorker() throws Exception {
        SimulationDTO.StatusResponse status = submit(false);

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(queue).submit(json.capture());
        JsonNode job = objectMapper.readTree(json.getValue());
        assertEquals(Set.of("schema_version", "job_id", "kind", "regulation", "team_paste"), fieldNames(job));
        assertEquals(1, job.get("schema_version").asInt());
        assertEquals("simulate", job.get("kind").asText());
        assertEquals("gen9championsvgc2026regmc", job.get("regulation").asText());
        assertEquals(PASTE, job.get("team_paste").asText());
        assertEquals(status.getJob().getId().toString(), job.get("job_id").asText());

        verify(workerStarter).start();
        assertTrue(status.isEnabled());
        assertFalse(status.isCanRun(), "one unfinished job per team");
        assertEquals("QUEUED", status.getJob().getStatus());
        assertTrue(status.getJob().isUnfinished());
        assertNull(status.getResult());

        SimulationJob saved = jobRepository.findById(status.getJob().getId()).orElseThrow();
        assertEquals(64, saved.getPasteSha256().length());
        assertEquals(owner.getId(), saved.getRequestedBy());
        assertEquals("full", status.getJob().getDepth());
    }

    // ==================== Paste normalization ====================

    private void pasteIs(String text) {
        PokepasteDTO.PasteData paste = new PokepasteDTO.PasteData();
        paste.setRawText(text);
        when(pokepasteService.fetchPasteData(anyString())).thenReturn(paste);
    }

    @Test
    void aQueuedJobShowsItsPlaceInTheQueue() {
        SimulationDTO.StatusResponse status = submit(false);

        // Nothing else is queued and the worker is off: only its start-up is ahead.
        assertEquals(0, status.getJob().getJobsAhead());
        assertTrue(status.getJob().getStartsInMinutes() >= 1);
        assertEquals("starting", status.getQueue().getState());
        assertEquals(1, status.getQueue().getJobsAhead());
        assertTrue(status.getQueue().getWaitMinutes() > status.getJob().getStartsInMinutes());

        when(queue.jobState(status.getJob().getId().toString())).thenReturn(Map.of("status", "running"));
        poller.poll();
        status = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner");
        assertNull(status.getJob().getJobsAhead(), "only while it waits its turn");
        assertNull(status.getJob().getStartsInMinutes());
        assertEquals("busy", status.getQueue().getState());
    }

    @Test
    void aMegaFormeIsSentAsItsBaseSpeciesWithANote() throws Exception {
        pasteIs("Chompy (Garchomp-Mega) @ Garchompite\nAbility: Rough Skin\n- Protect\n");
        SimulationDTO.StatusResponse status = submit(false);

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(queue).submit(json.capture());
        assertEquals("Chompy (Garchomp) @ Garchompite\nAbility: Rough Skin\n- Protect\n",
                objectMapper.readTree(json.getValue()).get("team_paste").asText());
        assertEquals(List.of("Garchomp-Mega was sent as Garchomp holding Garchompite."),
                status.getJob().getPasteNotes());
    }

    @Test
    void aMegaFormeWithoutItsStoneIsRefusedBeforeAnythingIsQueued() {
        pasteIs("Garchomp-Mega @ Life Orb\nAbility: Rough Skin\n");
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> submit(false));
        assertTrue(e.getMessage().contains("needs to hold Garchompite"), e.getMessage());
        verify(queue, never()).submit(anyString());
        verify(workerStarter, never()).start();
        assertTrue(jobRepository.findAll().isEmpty());
    }

    @Test
    void unchangedComparesThePasteAsSent() {
        pasteIs("Garchomp-Mega @ Garchompite\nAbility: Rough Skin\n");
        finishWith(submit(false).getJob().getId(), completeJson);

        // The same team written the standard way is the same simulation
        pasteIs("Garchomp @ Garchompite\nAbility: Rough Skin\n");
        SimulationConflictException e = assertThrows(SimulationConflictException.class, () -> submit(false));
        assertEquals(SimulationConflictException.UNCHANGED, e.getCode());
        assertEquals(1, simulationService.getStatus(team.getId(), owner.getId(), "sim-owner")
                .getJob().getPasteNotes().size());
    }

    @Test
    void aStandardPasteHasNoNotes() {
        assertEquals(List.of(), submit(false).getJob().getPasteNotes());
    }

    @Test
    void aQuickSimulationSkipsTheCarefulGames() throws Exception {
        SimulationDTO.StatusResponse status = submit(Depth.QUICK, false);

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(queue).submit(json.capture());
        JsonNode job = objectMapper.readTree(json.getValue());
        assertEquals(0, job.get("options").get("search_opponents").asInt());
        assertEquals(Set.of("search_opponents"), fieldNames(job.get("options")));
        assertEquals("quick", status.getJob().getDepth());

        finishWith(status.getJob().getId(), completeJson);
        assertEquals("quick",
                simulationService.getStatus(team.getId(), owner.getId(), "sim-owner").getResult().getDepth());
    }

    @Test
    void aFullResultCoversAQuickRunButNotTheOtherWayRound() {
        finishWith(submit(Depth.QUICK, false).getJob().getId(), completeJson);
        // Same paste: a full run adds the careful games, so it's allowed.
        UUID full = submit(Depth.FULL, false).getJob().getId();
        finishWith(full, completeJson);

        SimulationConflictException e = assertThrows(SimulationConflictException.class,
                () -> submit(Depth.QUICK, false));
        assertEquals(SimulationConflictException.UNCHANGED, e.getCode());
        assertThrows(SimulationConflictException.class, () -> submit(Depth.FULL, false));
    }

    @Test
    void theStatusCountsRunsLeftTodayForThoseWhoMayRun() {
        assertEquals(2, simulationService.getStatus(team.getId(), owner.getId(), "sim-owner").getRunsLeftToday());
        finishWith(submit(false).getJob().getId(), completeJson);
        assertEquals(1, simulationService.getStatus(team.getId(), owner.getId(), "sim-owner").getRunsLeftToday());
        assertNull(simulationService.getStatus(team.getId(), collaborator.getId(), "sim-collab").getRunsLeftToday());
    }

    @Test
    void submitIsOwnerAndAllowlistOnly() {
        assertThrows(TeamAccessDeniedException.class,
                () -> simulationService.submit(team.getId(), collaborator.getId(), "sim-collab", Depth.FULL, false));

        User other = saveUser("not-allowed");
        Team othersTeam = saveTeam(other, "VGC 2026 Regulation M-C");
        assertThrows(TeamAccessDeniedException.class,
                () -> simulationService.submit(othersTeam.getId(), other.getId(), "not-allowed", Depth.FULL, false));
        verify(queue, never()).submit(anyString());
    }

    @Test
    void collaboratorsCanViewButNotRun() {
        SimulationDTO.StatusResponse status = simulationService.getStatus(team.getId(), collaborator.getId(), "sim-collab");
        assertTrue(status.isEnabled());
        assertFalse(status.isCanRun());
        assertTrue(simulationService.getStatus(team.getId(), owner.getId(), "sim-owner").isCanRun());
    }

    @Test
    void submitRejectsOtherRegulations() {
        team.setRegulation("VGC 2026 Regulation M-B");
        assertThrows(IllegalArgumentException.class, () -> submit(false));

        SimulationDTO.StatusResponse status = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner");
        assertFalse(status.isCanRun());
        assertNotNull(status.getRunBlockedReason());
    }

    @Test
    void submitRejectsASecondUnfinishedJob() {
        submit(false);
        SimulationConflictException e = assertThrows(SimulationConflictException.class, () -> submit(true));
        assertEquals(SimulationConflictException.UNFINISHED, e.getCode());
    }

    @Test
    void submitRejectsAnUnchangedPasteUnlessForced() {
        UUID first = submit(false).getJob().getId();
        finishWith(first, completeJson);

        SimulationConflictException e = assertThrows(SimulationConflictException.class, () -> submit(false));
        assertEquals(SimulationConflictException.UNCHANGED, e.getCode());

        assertNotEquals(first, submit(true).getJob().getId());
    }

    @Test
    void submitEnforcesTheDailyCap() {
        finishWith(submit(false).getJob().getId(), completeJson);
        finishWith(submit(true).getJob().getId(), completeJson);

        assertThrows(RateLimitExceededException.class, () -> submit(true));
        SimulationDTO.StatusResponse status = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner");
        assertFalse(status.isCanRun());
        assertNotNull(status.getRunBlockedReason());
    }

    // ==================== Poller ====================

    @Test
    void pollerFollowsAJobThroughToCompletion() throws Exception {
        UUID id = submit(false).getJob().getId();
        String key = id.toString();
        clearInvocations(workerStarter);

        // Not claimed yet: no hash
        poller.poll();
        assertEquals(Status.QUEUED, job(id).getStatus());
        assertNull(job(id).getStartedAt());
        verify(workerStarter).start();

        // Claimed and running
        when(queue.jobState(key)).thenReturn(Map.of("status", "running", "progress", "preview 12/40"));
        poller.poll();
        assertEquals(Status.RUNNING, job(id).getStatus());
        assertEquals("preview 12/40", job(id).getProgress());
        Instant startedAt = job(id).getStartedAt();
        assertNotNull(startedAt, "first seen running");

        // Requeued after a retry: not a failure
        when(queue.jobState(key)).thenReturn(Map.of("status", "queued", "progress", "games 8/40"));
        poller.poll();
        assertEquals(Status.QUEUED, job(id).getStatus());
        assertNull(job(id).getErrorCode());
        assertEquals(startedAt, job(id).getStartedAt(), "a retry keeps when it first started");

        // Partial result
        when(queue.jobState(key)).thenReturn(Map.of("status", "running", "progress", "search 3/10", "partial", "1"));
        when(queue.partial(key)).thenReturn(Optional.of(partialJson));
        poller.poll();
        assertEquals(Status.PARTIAL, job(id).getStatus());
        assertEquals("search 3/10", job(id).getProgress());
        SimulationDTO.StatusResponse status = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner");
        assertEquals("partial", status.getResult().getStatus());
        assertEquals(480, simulationService.getSimulatedUsageStats(team.getId()).getTotalGames());

        // A retry keeps the partial
        when(queue.jobState(key)).thenReturn(Map.of("status", "queued", "progress", "search 3/10", "partial", "1"));
        poller.poll();
        assertEquals(Status.PARTIAL, job(id).getStatus());

        // Final result: saved, then Redis cleaned up
        clearInvocations(workerStarter);
        when(queue.result(key)).thenReturn(Optional.of(completeJson));
        poller.poll();
        SimulationJob done = job(id);
        assertEquals(Status.COMPLETE, done.getStatus());
        assertFalse(done.isUnfinished());
        assertNotNull(done.getFinishedAt());
        verify(queue).cleanup(key);
        assertFalse(done.isCleanupPending());
        verify(workerStarter, never()).start();

        // Only provenance.model and provenance.created are kept
        JsonNode provenance = objectMapper.readTree(done.getResult()).get("provenance");
        assertEquals(Set.of("model", "created"), fieldNames(provenance));

        status = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner");
        assertEquals("COMPLETE", status.getJob().getStatus());
        assertEquals("complete", status.getResult().getStatus());
        assertEquals(12, status.getResult().getOpponentsCount());
        assertEquals(480, status.getResult().getTotalGames());
        // Same per-Pokémon totals as the custom matchup below
        SimulationDTO.OpponentPokemon garchomp = status.getResult().getOpponentPokemon().stream()
                .filter(p -> p.getPokemon().equals("Garchomp")).findFirst().orElseThrow();
        assertEquals(296, garchomp.getGamesAgainst());
        assertEquals(159, garchomp.getWinsAgainst());
        assertFalse(status.getResult().isStale());
    }

    @Test
    void invalidTeamShowsTheEnginesMessage() {
        UUID id = submit(false).getJob().getId();
        finishWith(id, failedJson(id, "invalid_team", "the team isn't valid: a team has 6 Pokémon, this one 5"));

        SimulationJob job = job(id);
        assertEquals(Status.FAILED, job.getStatus());
        assertEquals("invalid_team", job.getErrorCode());
        assertEquals("the team isn't valid: a team has 6 Pokémon, this one 5", job.getErrorMessage());
        verify(queue).cleanup(id.toString());
    }

    @Test
    void internalFailuresShowAGenericMessage() {
        UUID id = submit(false).getJob().getId();
        finishWith(id, failedJson(id, "internal", "CUDA out of memory"));

        SimulationJob job = job(id);
        assertEquals(Status.FAILED, job.getStatus());
        assertEquals("internal", job.getErrorCode());
        assertFalse(job.getErrorMessage().contains("CUDA"));
    }

    @Test
    void cancelWaitsForTheEngineToConfirm() {
        UUID id = submit(false).getJob().getId();

        SimulationDTO.StatusResponse status = simulationService.cancel(team.getId(), owner.getId(), "sim-owner");
        verify(queue).cancel(id.toString());
        assertTrue(status.getJob().isCancelRequested());
        assertTrue(status.getJob().isUnfinished());

        // Cancelling twice sends nothing more
        simulationService.cancel(team.getId(), owner.getId(), "sim-owner");
        verify(queue, times(1)).cancel(id.toString());

        assertThrows(TeamAccessDeniedException.class,
                () -> simulationService.cancel(team.getId(), collaborator.getId(), "sim-collab"));

        finishWith(id, failedJson(id, "cancelled", "cancelled"));
        SimulationJob job = job(id);
        assertEquals(Status.CANCELLED, job.getStatus());
        assertNull(job.getErrorMessage());
        verify(queue).cleanup(id.toString());
    }

    @Test
    void aJobWithNoChangeForThreeHoursFailsButStaysCancelledUntilTheWorkerIsDone() {
        UUID id = submit(false).getJob().getId();
        String key = id.toString();
        when(queue.jobState(key)).thenReturn(Map.of("status", "running", "progress", "search 3/10"));
        Instant start = Instant.now();
        simulationService.pollJob(id, start);
        assertEquals(Status.RUNNING, job(id).getStatus());

        simulationService.pollJob(id, start.plus(Duration.ofHours(2)));
        assertEquals(Status.RUNNING, job(id).getStatus());

        simulationService.pollJob(id, start.plus(Duration.ofHours(3)).plusSeconds(1));
        SimulationJob job = job(id);
        assertEquals(Status.FAILED, job.getStatus());
        assertEquals("timeout", job.getErrorCode());
        assertTrue(job.isReconcilePending());
        assertFalse(job.isCleanupPending());

        // A worker may still claim it: it's cancelled, its keys are kept, and the
        // worker is woken so it can claim it and acknowledge the cancel
        clearInvocations(workerStarter);
        poller.poll();
        verify(queue).cancel(key);
        verify(queue, never()).cleanup(key);
        verify(workerStarter).start();

        // Once the worker publishes, it's cleaned up
        when(queue.result(key)).thenReturn(Optional.of(failedJson(id, "cancelled", "cancelled")));
        poller.poll();
        verify(queue).cleanup(key);
        assertFalse(job(id).isReconcilePending());
        assertEquals(Status.FAILED, job(id).getStatus());
    }

    @Test
    void aTimedOutJobIsFollowedUntilALateWorkerAcknowledgesIt() {
        UUID id = submit(false).getJob().getId();
        String key = id.toString();
        Instant start = Instant.now();
        simulationService.pollJob(id, start.plus(Duration.ofHours(4)));
        assertTrue(job(id).isReconcilePending());

        // Weeks later, still no word: still followed, keys kept, but the worker isn't woken
        simulationService.reconcileJob(id, start.plus(Duration.ofDays(30)));
        assertTrue(job(id).isReconcilePending());
        assertFalse(simulationService.needsWorker(start.plus(Duration.ofDays(30))));

        // A late worker claims it, sees the cancel, and publishes: now it's cleaned up
        when(queue.result(key)).thenReturn(Optional.of(failedJson(id, "cancelled", "cancelled")));
        simulationService.reconcileJob(id, start.plus(Duration.ofDays(31)));
        assertFalse(job(id).isReconcilePending());
        assertTrue(job(id).isCleanupPending());
        poller.poll();
        verify(queue).cleanup(key);
    }

    @Test
    void theTimeoutStillAppliesWhileTheQueueIsDown() {
        UUID id = submit(false).getJob().getId();
        when(queue.result(id.toString())).thenThrow(new RuntimeException("connection refused"));

        Instant start = Instant.now();
        assertEquals(SimulationService.PollOutcome.QUEUE_ERROR, simulationService.pollJob(id, start));
        assertEquals(Status.QUEUED, job(id).getStatus());

        simulationService.pollJob(id, start.plus(Duration.ofHours(3)).plusSeconds(1));
        assertEquals(Status.FAILED, job(id).getStatus());
        assertEquals("timeout", job(id).getErrorCode());
        assertTrue(job(id).isReconcilePending());
    }

    @Test
    void aDeletedTeamsJobIsCancelledCleanedAndLaterPurged() {
        Team doomed = saveTeam(owner, "VGC 2026 Regulation M-C");
        UUID id = simulationService.submit(doomed.getId(), owner.getId(), "sim-owner", Depth.FULL, false).getJob().getId();

        // Delete it the way the app does, from a clean persistence context
        entityManager.flush();
        entityManager.clear();
        teamService.deleteTeam(doomed.getId(), owner.getId());
        entityManager.flush();
        entityManager.clear();
        assertNull(job(id).getTeam(), "the job outlives its team (ON DELETE SET NULL)");

        poller.poll();
        verify(queue).cancel(id.toString());

        finishWith(id, failedJson(id, "cancelled", "cancelled"));
        verify(queue).cleanup(id.toString());
        // Kept for now: today's cap still counts it
        assertTrue(jobRepository.findById(id).isPresent());

        simulationService.purgeOrphanedJobs(Instant.now().plus(Duration.ofDays(3)));
        assertTrue(jobRepository.findById(id).isEmpty());
    }

    @Test
    void aReRunThatStopsAfterItsPartialKeepsShowingTheCompleteResult() {
        UUID first = submit(false).getJob().getId();
        finishWith(first, completeJson);

        UUID rerun = submit(true).getJob().getId();
        String key = rerun.toString();
        when(queue.jobState(key)).thenReturn(Map.of("status", "running", "progress", "search 3/10", "partial", "1"));
        when(queue.partial(key)).thenReturn(Optional.of(partialJson));
        poller.poll();
        // While it runs, the complete result stays
        assertEquals(first, simulationService.getStatus(team.getId(), owner.getId(), "sim-owner").getResult().getJobId());

        finishWith(rerun, failedJson(rerun, "cancelled", "cancelled"));
        SimulationDTO.StatusResponse status = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner");
        assertEquals("CANCELLED", status.getJob().getStatus());
        assertEquals(first, status.getResult().getJobId());
        assertEquals("complete", status.getResult().getStatus());
        // And the pages serve the same one
        assertEquals("complete", simulationService.getDiagnostics(team.getId(), owner.getId()).getResultStatus());
    }

    @Test
    void aStoppedReRunOfAChangedPasteShowsItsPartial() {
        UUID first = submit(false).getJob().getId();
        finishWith(first, completeJson);
        team.setPokepaste("https://pokepast.es/edited");
        teamRepository.save(team);

        UUID rerun = submit(true).getJob().getId();
        when(queue.partial(rerun.toString())).thenReturn(Optional.of(partialJson));
        finishWith(rerun, failedJson(rerun, "cancelled", "cancelled"));

        SimulationDTO.ResultInfo result = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner").getResult();
        assertEquals(rerun, result.getJobId());
        assertEquals("partial", result.getStatus());
        assertFalse(result.isStale());
    }

    @Test
    void aPartialPublishedBeforeAFailureIsKept() {
        UUID id = submit(false).getJob().getId();
        when(queue.partial(id.toString())).thenReturn(Optional.of(partialJson));
        finishWith(id, failedJson(id, "internal", "worker died"));

        SimulationJob job = job(id);
        assertEquals(Status.FAILED, job.getStatus());
        assertNotNull(job.getResult());
        assertEquals(480, simulationService.getSimulatedUsageStats(team.getId()).getTotalGames());
    }

    @Test
    void aQueueFailureOnSubmitFailsTheJob() {
        doThrow(new RuntimeException("connection refused")).when(queue).submit(anyString());

        assertThrows(SimulationUnavailableException.class, () -> submit(false));
        SimulationJob job = jobRepository.findFirstByTeamIdAndKindOrderByCreatedAtDesc(team.getId(), SimulationJob.Kind.SIMULATE).orElseThrow();
        assertEquals(Status.FAILED, job.getStatus());
        assertEquals("queue_unavailable", job.getErrorCode());
        verify(workerStarter, never()).start();

        // The push may have landed anyway: the job is reconciled, not abandoned
        assertTrue(job.isReconcilePending());
        poller.poll();
        verify(queue).cancel(job.getId().toString());
    }

    @Test
    void aFailedPartialReadDoesNotHalfFinishTheJob() {
        UUID id = submit(false).getJob().getId();
        String key = id.toString();
        when(queue.result(key)).thenReturn(Optional.of(failedJson(id, "internal", "worker died")));
        when(queue.partial(key)).thenThrow(new RuntimeException("connection reset"));

        poller.poll();
        SimulationJob job = job(id);
        assertTrue(job.isUnfinished());
        assertFalse(job.isCleanupPending());
        verify(queue, never()).cleanup(key);

        // Next tick, with the queue back, it finishes and keeps the partial
        doReturn(Optional.of(partialJson)).when(queue).partial(key);
        poller.poll();
        assertEquals(Status.FAILED, job(id).getStatus());
        assertNotNull(job(id).getResult());
        verify(queue).cleanup(key);
    }

    @Test
    void theAllowlistIsCaseSensitive() {
        User lookalike = saveUser("SIM-OWNER");
        Team lookalikesTeam = saveTeam(lookalike, "VGC 2026 Regulation M-C");
        assertThrows(TeamAccessDeniedException.class,
                () -> simulationService.submit(lookalikesTeam.getId(), lookalike.getId(), "SIM-OWNER", Depth.FULL, false));
    }

    // ==================== Results ====================

    @Test
    void stalenessFollowsThePasteUrl() {
        finishWith(submit(false).getJob().getId(), completeJson);
        team.setPokepaste("https://pokepast.es/rain2");
        teamRepository.saveAndFlush(team);

        SimulationDTO.StatusResponse status = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner");
        assertTrue(status.getResult().isStale());
        assertTrue(status.isCanRun());
    }

    @Test
    void aCompleteResultRecordsItsModelAndPool() {
        UUID id = submit(false).getJob().getId();
        finishWith(id, completeJson);
        assertEquals("run24-latest-70830fb1", job(id).getModel());
        assertEquals("2026-10-23", job(id).getPoolSnapshot());

        SimulationDTO.StatusResponse status = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner");
        assertFalse(status.getResult().isStale());
        assertNull(status.getResult().getStaleReason());
    }

    @Test
    void aNewPoolMakesTheResultOutOfDateAndWorthRunningAgain() {
        finishWith(submit(false).getJob().getId(), completeJson);
        engineNowRuns("run24-latest-70830fb1", "2026-11-24");

        SimulationDTO.StatusResponse status = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner");
        assertTrue(status.getResult().isStale());
        assertEquals(SimulationDTO.StaleReason.POOL, status.getResult().getStaleReason());
        assertTrue(simulationService.getDiagnostics(team.getId(), owner.getId()).isStale());
        // The same paste may run again without forcing it.
        assertEquals("QUEUED", submit(false).getJob().getStatus());
    }

    @Test
    void aNewModelMakesTheResultOutOfDate() {
        finishWith(submit(false).getJob().getId(), completeJson);
        engineNowRuns("run27-latest-00000000", "2026-10-23");

        SimulationDTO.StatusResponse status = simulationService.getStatus(team.getId(), owner.getId(), "sim-owner");
        assertEquals(SimulationDTO.StaleReason.MODEL, status.getResult().getStaleReason());
    }

    @Test
    void aResultFromBeforePoolsWereRecordedIsOutOfDateOnceOneIs() {
        UUID id = submit(false).getJob().getId();
        finishWith(id, completeJson);
        SimulationJob old = job(id);
        old.setPoolSnapshot(null);
        jobRepository.saveAndFlush(old);
        assertFalse(simulationService.getStatus(team.getId(), owner.getId(), "sim-owner").getResult().isStale(),
                "no pool known yet");

        engineNowRuns("run24-latest-70830fb1", "2026-10-23");
        assertEquals(SimulationDTO.StaleReason.POOL,
                simulationService.getStatus(team.getId(), owner.getId(), "sim-owner").getResult().getStaleReason());
    }

    @Test
    void aPasteChangeIsReportedBeforeAnEngineChange() {
        finishWith(submit(false).getJob().getId(), completeJson);
        engineNowRuns("run27-latest-00000000", "2026-11-24");
        team.setPokepaste("https://pokepast.es/rain2");
        teamRepository.saveAndFlush(team);

        assertEquals(SimulationDTO.StaleReason.TEAM,
                simulationService.getStatus(team.getId(), owner.getId(), "sim-owner").getResult().getStaleReason());
    }

    @Test
    void noResultMeansNotFound() {
        assertThrows(SimulationNotFoundException.class, () -> simulationService.getSimulatedUsageStats(team.getId()));
        assertThrows(SimulationNotFoundException.class, () -> simulationService.getDiagnostics(team.getId(), owner.getId()));
    }

    @Test
    void simulatedAnalyticsServeTheResultsMetrics() {
        finishWith(submit(false).getJob().getId(), completeJson);
        assertEquals("Raichu", simulationService.getSimulatedMatchupStats(team.getId()).getBestMatchups().get(0).getPokemon());
        assertEquals("Archaludon", simulationService.getSimulatedMoveUsage(team.getId()).getPokemonMoves().get(0).getPokemon());
    }

    /**
     * Totals worked out by hand from the fixture's 12 opponent rows.
     */
    @Test
    void customMatchupOverOpponents() {
        finishWith(submit(false).getJob().getId(), completeJson);

        AnalyticsDTO.CustomMatchupResponse response = simulationService.getSimulatedCustomMatchup(team.getId(),
                new AnalyticsDTO.CustomMatchupRequest(List.of("Garchomp", "Kingambit", "Sneasler", "Incineroar")));

        assertEquals(List.of("Garchomp", "Incineroar", "Sneasler", "Kingambit"),
                response.getPokemonAnalysis().stream().map(AnalyticsDTO.CustomPokemonAnalysis::getPokemon).toList());
        assertAnalysis(response.getPokemonAnalysis().get(0), 296, 159, 54);
        assertAnalysis(response.getPokemonAnalysis().get(1), 216, 114, 53);
        assertAnalysis(response.getPokemonAnalysis().get(2), 176, 83, 47);
        assertAnalysis(response.getPokemonAnalysis().get(3), 136, 69, 51);
        assertEquals(51, response.getTeamWinRate());     // 179 / 352
        assertEquals(51, response.getAverageWinRate());  // (54 + 53 + 47 + 51) / 4
        assertEquals(80, response.getTotalEncounters()); // two rows with all four, 40 games each
    }

    @Test
    void diagnosticsSortThreatsWorstFirst() {
        finishWith(submit(false).getJob().getId(), completeJson);

        SimulationDTO.DiagnosticsResponse diagnostics = simulationService.getDiagnostics(team.getId(), collaborator.getId());
        assertEquals("complete", diagnostics.getResultStatus());
        assertEquals(12, diagnostics.getOpponentsCount());
        assertEquals(480, diagnostics.getGames());
        assertEquals(6, diagnostics.getMembers().size());
        assertSortedByDelta(diagnostics.getThreatSpecies());
        assertSortedByDelta(diagnostics.getThreatPairs());
    }

    // ==================== Helpers ====================

    private SimulationDTO.StatusResponse submit(boolean force) {
        return submit(Depth.FULL, force);
    }

    private SimulationDTO.StatusResponse submit(Depth depth, boolean force) {
        return simulationService.submit(team.getId(), owner.getId(), "sim-owner", depth, force);
    }

    private void finishWith(UUID id, String resultJson) {
        when(queue.result(id.toString())).thenReturn(Optional.of(resultJson));
        poller.poll();
    }

    /** Another team's job just completed on this model and pool. */
    private void engineNowRuns(String model, String pool) {
        SimulationJob other = new SimulationJob();
        other.setId(UUID.randomUUID());
        other.setTeam(saveTeam(collaborator, "VGC 2026 Regulation M-C"));
        other.setRequestedBy(collaborator.getId());
        other.setPasteUrl("https://pokepast.es/other");
        other.setPasteSha256("0".repeat(64));
        other.setStatus(Status.COMPLETE);
        other.setModel(model);
        other.setPoolSnapshot(pool);
        other.setLastChangedAt(Instant.now().plusSeconds(60));
        jobRepository.saveAndFlush(other);
    }

    private SimulationJob job(UUID id) {
        return jobRepository.findById(id).orElseThrow();
    }

    private static String failedJson(UUID id, String code, String message) {
        return """
                {"schema_version":1,"kind":"simulate","job_id":"%s","regulation":"gen9championsvgc2026regmc",
                 "status":"failed","error":{"code":"%s","message":"%s"}}
                """.formatted(id, code, message);
    }

    private static Set<String> fieldNames(JsonNode node) {
        Set<String> names = new HashSet<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }

    private static void assertAnalysis(AnalyticsDTO.CustomPokemonAnalysis analysis, int games, int wins, int winRate) {
        assertEquals(games, analysis.getGamesAgainst(), analysis.getPokemon() + " games");
        assertEquals(wins, analysis.getWinsAgainst(), analysis.getPokemon() + " wins");
        assertEquals(winRate, analysis.getWinRate(), analysis.getPokemon() + " win rate");
    }

    private static void assertSortedByDelta(List<com.yeskatronics.vs_recorder_backend.dto.SimulationResult.Threat> threats) {
        assertFalse(threats.isEmpty());
        for (int i = 1; i < threats.size(); i++) {
            Double prev = threats.get(i - 1).getDelta();
            Double next = threats.get(i).getDelta();
            if (prev != null && next != null) {
                assertTrue(prev <= next, "threats sorted worst first");
            }
        }
    }

    private User saveUser(String username) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(username + "@example.com");
        u.setPasswordHash("hashed_password");
        return userRepository.save(u);
    }

    private Team saveTeam(User user, String regulation) {
        Team t = new Team();
        t.setUser(user);
        t.setName("Other");
        t.setPokepaste("https://pokepast.es/other");
        t.setRegulation(regulation);
        return teamRepository.save(t);
    }
}
