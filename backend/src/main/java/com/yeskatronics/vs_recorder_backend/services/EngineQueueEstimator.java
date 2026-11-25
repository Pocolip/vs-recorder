package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.SimulationDTO;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Depth;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Kind;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Status;
import com.yeskatronics.vs_recorder_backend.repositories.SimulationJobRepository;
import com.yeskatronics.vs_recorder_backend.repositories.SimulationJobRepository.QueuedJob;
import com.yeskatronics.vs_recorder_backend.repositories.SimulationJobRepository.RunTime;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Estimates waits in the matchup engine's queue, from the jobs in the database.
 *
 * The engine has one worker that runs one job at a time, oldest first, and powers off
 * a few minutes after its last job. So a job waits for the start-up (when nothing is
 * running) plus what's left of every job ahead of it. Each kind of job is assumed to
 * take its median measured run time, or a default until enough runs are measured.
 *
 * Polls see a job start and finish to within a minute, which is plenty for this.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EngineQueueEstimator {

    /** Run times used until enough runs are measured. */
    static final Duration DEFAULT_QUICK = Duration.ofMinutes(15);
    static final Duration DEFAULT_FULL = Duration.ofMinutes(50);
    static final Duration DEFAULT_PLAN = Duration.ofMinutes(5);
    /** From asking the worker to start until it claims its first job. */
    static final Duration STARTUP = Duration.ofMinutes(3);
    /**
     * The worker stays up 10 minutes after its last job. A little less here: a finish is
     * seen up to a poll late.
     */
    static final Duration STAYS_UP = Duration.ofMinutes(9);
    /** A typical run time is the median of this many recent runs... */
    static final int SAMPLE = 20;
    /** ...once there are at least this many. */
    static final int MIN_SAMPLE = 3;
    /** A job past its typical time (running, or the worker starting) is given this much more. */
    static final Duration MIN_REMAINING = Duration.ofMinutes(1);

    private final SimulationJobRepository jobRepository;

    private enum RunType { QUICK, FULL, PLAN }

    /** The queue as it is now. */
    public Snapshot snapshot(Instant now) {
        List<QueuedJob> unfinished = jobRepository.findByStatusInOrderByCreatedAtAsc(SimulationJob.UNFINISHED);
        Map<RunType, Duration> typical = new EnumMap<>(RunType.class);
        typical.put(RunType.QUICK, typical(jobRepository
                .findByKindAndDepthAndStatusAndStartedAtNotNullAndFinishedAtNotNullOrderByFinishedAtDesc(
                        Kind.SIMULATE, Depth.QUICK, Status.COMPLETE, PageRequest.of(0, SAMPLE)), DEFAULT_QUICK));
        typical.put(RunType.FULL, typical(jobRepository
                .findByKindAndDepthAndStatusAndStartedAtNotNullAndFinishedAtNotNullOrderByFinishedAtDesc(
                        Kind.SIMULATE, Depth.FULL, Status.COMPLETE, PageRequest.of(0, SAMPLE)), DEFAULT_FULL));
        typical.put(RunType.PLAN, typical(jobRepository
                .findByKindAndStatusAndStartedAtNotNullAndFinishedAtNotNullOrderByFinishedAtDesc(
                        Kind.PLAN, Status.COMPLETE, PageRequest.of(0, SAMPLE)), DEFAULT_PLAN));
        boolean recentlyRan = jobRepository.existsByStartedAtNotNullAndFinishedAtAfter(now.minus(STAYS_UP));
        return new Snapshot(unfinished, typical, recentlyRan, now);
    }

    static Duration typical(List<RunTime> runs, Duration fallback) {
        List<Duration> times = runs.stream()
                .map(run -> Duration.between(run.getStartedAt(), run.getFinishedAt()))
                .filter(time -> !time.isNegative())
                .sorted()
                .toList();
        if (times.size() < MIN_SAMPLE) {
            return fallback;
        }
        int middle = times.size() / 2;
        return times.size() % 2 == 1 ? times.get(middle) : times.get(middle - 1).plus(times.get(middle)).dividedBy(2);
    }

    /** One look at the queue, to answer for several jobs alike. */
    public static final class Snapshot {

        /** Jobs the worker will spend time on, in its order. One it was asked to cancel stops at once. */
        private final List<QueuedJob> active;
        private final Map<UUID, Integer> positions = new HashMap<>();
        /** Before the first job: the worker powering on, when it isn't running one. */
        private final Duration startupLeft;
        private final List<Duration> remaining;
        private final String state;

        private Snapshot(List<QueuedJob> unfinished, Map<RunType, Duration> typical, boolean recentlyRan, Instant now) {
            active = unfinished.stream().filter(job -> !job.isCancelRequested()).toList();
            for (int i = 0; i < active.size(); i++) {
                positions.put(active.get(i).getId(), i);
            }
            remaining = active.stream().map(job -> {
                Duration time = typical.get(runType(job));
                if (job.getStartedAt() != null) {
                    time = atLeastMin(time.minus(Duration.between(job.getStartedAt(), now)));
                }
                return time;
            }).toList();

            boolean running = active.stream().anyMatch(job -> job.getStartedAt() != null);
            if (running || recentlyRan) {
                // Running a job, or still up after one: it takes the next one at once.
                startupLeft = Duration.ZERO;
                state = running || !active.isEmpty() ? "busy" : "awake";
            } else if (active.isEmpty()) {
                startupLeft = STARTUP;
                state = "asleep";
            } else {
                // Asked to start when the oldest job was submitted.
                startupLeft = atLeastMin(STARTUP.minus(Duration.between(active.get(0).getCreatedAt(), now)));
                state = "starting";
            }
        }

        private static RunType runType(QueuedJob job) {
            if (job.getKind() == Kind.PLAN) {
                return RunType.PLAN;
            }
            // Jobs from before depths existed are full ones.
            return job.getDepth() == Depth.QUICK ? RunType.QUICK : RunType.FULL;
        }

        private static Duration atLeastMin(Duration time) {
            return time.compareTo(MIN_REMAINING) < 0 ? MIN_REMAINING : time;
        }

        /** The wait before the first {@code ahead} active jobs are done. */
        private Duration waitBehind(int ahead) {
            Duration wait = startupLeft;
            for (int i = 0; i < ahead; i++) {
                wait = wait.plus(remaining.get(i));
            }
            return wait;
        }

        /** The queue as a job submitted now would find it. */
        public SimulationDTO.QueueInfo forNewJob() {
            return SimulationDTO.QueueInfo.builder()
                    .state(state)
                    .jobsAhead(active.size())
                    .waitMinutes(minutes(waitBehind(active.size())))
                    .build();
        }

        /** A job still waiting its turn: the jobs ahead and how long until it starts. */
        public Optional<Wait> forJob(SimulationJob job) {
            Integer position = positions.get(job.getId());
            if (position == null || job.getStatus() != Status.QUEUED || job.getStartedAt() != null) {
                return Optional.empty();
            }
            return Optional.of(new Wait(position, minutes(waitBehind(position))));
        }

        /** Rounded up: "starts in about 0 minutes" would be wrong while it hasn't. */
        private static int minutes(Duration time) {
            long seconds = time.getSeconds();
            return (int) ((seconds + 59) / 60);
        }
    }

    public record Wait(int jobsAhead, int startsInMinutes) {}
}
