package com.yeskatronics.vs_recorder_backend.engine;

/**
 * Wakes the engine's GPU worker, which is stopped when idle.
 *
 * Called after every submit and on every poll while a job is unfinished. It must be
 * safe to call on a running worker, and it never throws: a failed start is retried
 * on the next poll.
 */
public interface WorkerStarter {

    void start();
}
