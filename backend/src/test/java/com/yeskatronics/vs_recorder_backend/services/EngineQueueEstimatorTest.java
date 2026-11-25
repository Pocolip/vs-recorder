package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.SimulationDTO;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Depth;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Kind;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Status;
import com.yeskatronics.vs_recorder_backend.repositories.SimulationJobRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Queue waits from jobs in the database. Each test picks "now" relative to the jobs it
 * saves, so their real creation times don't matter.
 */
@SpringBootTest
@Transactional
class EngineQueueEstimatorTest {

    @Autowired private EngineQueueEstimator estimator;
    @Autowired private SimulationJobRepository jobRepository;
    @Autowired private EntityManager entityManager;

    @Test
    void anEmptyQueueWithTheWorkerOffWaitsForItToStart() {
        SimulationDTO.QueueInfo queue = estimator.snapshot(Instant.now()).forNewJob();

        assertEquals("asleep", queue.getState());
        assertEquals(0, queue.getJobsAhead());
        assertEquals(minutes(EngineQueueEstimator.STARTUP), queue.getWaitMinutes());
    }

    @Test
    void theWorkerIsStillUpRightAfterAJob() {
        Instant now = Instant.now();
        save(Kind.PLAN, null, Status.COMPLETE, now.minus(Duration.ofMinutes(10)), now.minus(Duration.ofMinutes(5)));

        SimulationDTO.QueueInfo queue = estimator.snapshot(now).forNewJob();

        assertEquals("awake", queue.getState());
        assertEquals(0, queue.getWaitMinutes());
    }

    @Test
    void aJobWaitsForWhatIsLeftOfEveryJobAheadOfIt() {
        SimulationJob running = save(Kind.SIMULATE, Depth.FULL, Status.RUNNING, null, null);
        SimulationJob firstPlan = save(Kind.PLAN, null, Status.QUEUED, null, null);
        SimulationJob secondPlan = save(Kind.PLAN, null, Status.QUEUED, null, null);
        SimulationJob quick = save(Kind.SIMULATE, Depth.QUICK, Status.QUEUED, null, null);
        Instant now = Instant.now();
        startedAt(running, now.minus(Duration.ofMinutes(20)));

        EngineQueueEstimator.Snapshot snapshot = estimator.snapshot(now);

        assertTrue(snapshot.forJob(running).isEmpty(), "a running job isn't waiting");
        // The full job has 50 - 20 = 30 minutes left; each plan takes 5.
        assertEquals(new EngineQueueEstimator.Wait(1, 30), snapshot.forJob(firstPlan).orElseThrow());
        assertEquals(new EngineQueueEstimator.Wait(2, 35), snapshot.forJob(secondPlan).orElseThrow());
        assertEquals(new EngineQueueEstimator.Wait(3, 40), snapshot.forJob(quick).orElseThrow());
        SimulationDTO.QueueInfo queue = snapshot.forNewJob();
        assertEquals("busy", queue.getState());
        assertEquals(4, queue.getJobsAhead());
        assertEquals(55, queue.getWaitMinutes());
    }

    @Test
    void jobsWaitingForTheWorkerToStartCountWhatIsLeftOfTheStartUp() {
        SimulationJob first = save(Kind.PLAN, null, Status.QUEUED, null, null);
        SimulationJob second = save(Kind.PLAN, null, Status.QUEUED, null, null);
        Instant now = first.getCreatedAt().plus(Duration.ofMinutes(1));

        EngineQueueEstimator.Snapshot snapshot = estimator.snapshot(now);

        assertEquals("starting", snapshot.forNewJob().getState());
        assertEquals(new EngineQueueEstimator.Wait(0, 2), snapshot.forJob(first).orElseThrow());
        assertEquals(new EngineQueueEstimator.Wait(1, 7), snapshot.forJob(second).orElseThrow());
        assertEquals(12, snapshot.forNewJob().getWaitMinutes());
    }

    @Test
    void aJobPastItsTypicalTimeStillHasAMinuteLeft() {
        SimulationJob running = save(Kind.PLAN, null, Status.RUNNING, null, null);
        Instant now = Instant.now();
        startedAt(running, now.minus(Duration.ofMinutes(30)));

        assertEquals(1, estimator.snapshot(now).forNewJob().getWaitMinutes());
    }

    @Test
    void jobsBeingCancelledAreSkipped() {
        SimulationJob cancelled = save(Kind.SIMULATE, Depth.FULL, Status.QUEUED, null, null);
        cancelled.setCancelRequested(true);
        SimulationJob plan = save(Kind.PLAN, null, Status.QUEUED, null, null);
        Instant now = Instant.now();

        EngineQueueEstimator.Snapshot snapshot = estimator.snapshot(now);

        assertTrue(snapshot.forJob(cancelled).isEmpty());
        assertEquals(0, snapshot.forJob(plan).orElseThrow().jobsAhead());
        assertEquals(1, snapshot.forNewJob().getJobsAhead());
    }

    @Test
    void measuredRunsReplaceTheDefaultOnceThereAreEnough() {
        Instant now = Instant.now();
        Instant longAgo = now.minus(Duration.ofHours(2));
        save(Kind.PLAN, null, Status.COMPLETE, longAgo, longAgo.plus(Duration.ofMinutes(4)));
        save(Kind.PLAN, null, Status.COMPLETE, longAgo, longAgo.plus(Duration.ofMinutes(8)));
        // Failed runs don't count.
        save(Kind.PLAN, null, Status.FAILED, longAgo, longAgo.plus(Duration.ofMinutes(1)));
        SimulationJob running = save(Kind.PLAN, null, Status.RUNNING, null, null);
        startedAt(running, now);
        save(Kind.PLAN, null, Status.QUEUED, null, null);

        // Two measured runs aren't enough: the default 5 minutes each.
        assertEquals(10, estimator.snapshot(now).forNewJob().getWaitMinutes());

        save(Kind.PLAN, null, Status.COMPLETE, longAgo, longAgo.plus(Duration.ofMinutes(9)));
        // The median of 4, 8 and 9 minutes.
        assertEquals(16, estimator.snapshot(now).forNewJob().getWaitMinutes());
    }

    private SimulationJob save(Kind kind, Depth depth, Status status, Instant startedAt, Instant finishedAt) {
        SimulationJob job = new SimulationJob();
        job.setId(UUID.randomUUID());
        job.setKind(kind);
        job.setDepth(depth);
        job.setStatus(status);
        job.setRequestedBy(1L);
        job.setPasteUrl("https://pokepast.es/x");
        job.setPasteSha256("0".repeat(64));
        job.setLastChangedAt(Instant.now());
        job.setStartedAt(startedAt);
        job.setFinishedAt(finishedAt);
        SimulationJob saved = jobRepository.saveAndFlush(job);
        // Creation times must differ, as they do between real submits.
        sleepAMillisecond();
        return saved;
    }

    private void startedAt(SimulationJob job, Instant startedAt) {
        job.setStartedAt(startedAt);
        jobRepository.saveAndFlush(job);
        entityManager.clear();
    }

    private static void sleepAMillisecond() {
        try {
            Thread.sleep(2);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static int minutes(Duration duration) {
        return (int) duration.toMinutes();
    }
}
