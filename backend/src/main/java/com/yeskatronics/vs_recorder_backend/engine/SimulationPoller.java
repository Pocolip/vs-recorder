package com.yeskatronics.vs_recorder_backend.engine;

import com.yeskatronics.vs_recorder_backend.services.SimulationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Follows unfinished simulation jobs on the engine's queue, once a minute.
 *
 * Each tick:
 * <ol>
 *   <li>brings every unfinished job up to date, each in its own transaction;</li>
 *   <li>keeps timed-out jobs cancelled until a worker is done with them;</li>
 *   <li>deletes the Redis keys of finished jobs (nothing there expires);</li>
 *   <li>if anything is still unfinished (or recently given up on), starts the worker. That's needed on every
 *       tick, not only on submit: a start fails while the instance is shutting down,
 *       and a job whose worker died has nothing else to bring one back.</li>
 * </ol>
 */
@Component
@ConditionalOnProperty(name = "engine.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class SimulationPoller {

    private final SimulationService simulationService;
    private final EngineQueue engineQueue;
    private final WorkerStarter workerStarter;

    @Scheduled(
            fixedDelayString = "${engine.poll-interval:PT1M}",
            initialDelayString = "${engine.poll-initial-delay:PT30S}")
    public void poll() {
        Instant now = Instant.now();
        int queueErrors = 0;

        for (UUID id : simulationService.unfinishedJobIds()) {
            try {
                if (simulationService.pollJob(id, now) == SimulationService.PollOutcome.QUEUE_ERROR) {
                    queueErrors++;
                }
            } catch (Exception e) {
                log.warn("Polling simulation job {} failed; retrying next tick: {}", id, e.toString());
            }
        }

        for (UUID id : simulationService.reconcilePendingJobIds()) {
            try {
                simulationService.reconcileJob(id, now);
            } catch (Exception e) {
                queueErrors++;
            }
        }

        List<UUID> toClean = simulationService.cleanupPendingJobIds();
        for (UUID id : toClean) {
            try {
                engineQueue.cleanup(id.toString());
                simulationService.markCleanedUp(id);
            } catch (Exception e) {
                queueErrors++;
            }
        }
        try {
            simulationService.purgeOrphanedJobs(now);
        } catch (Exception e) {
            log.warn("Purging orphaned simulation jobs failed: {}", e.toString());
        }

        // One line per tick while the queue is unreachable, not one per job.
        if (queueErrors > 0) {
            log.warn("Engine queue unreachable for {} simulation job operation(s); retrying next tick", queueErrors);
        }

        if (simulationService.needsWorker(now)) {
            workerStarter.start();
        }
    }
}
