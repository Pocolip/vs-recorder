package com.yeskatronics.vs_recorder_backend.engine;

import java.util.Map;
import java.util.Optional;

/**
 * The matchup engine's Redis job queue, as VS Recorder uses it.
 *
 * Keys (with the default prefix {@code vsr}):
 * <pre>
 *   submit    LPUSH vsr:jobs &lt;job JSON&gt;
 *   state     HGETALL vsr:job:&lt;id&gt;      (absent until a worker claims the job)
 *   partial   GET vsr:partial:&lt;id&gt;
 *   result    GET vsr:result:&lt;id&gt;
 *   cancel    SET vsr:cancel:&lt;id&gt; 1
 *   cleanup   DEL vsr:result:&lt;id&gt; vsr:partial:&lt;id&gt; vsr:job:&lt;id&gt; vsr:cancel:&lt;id&gt;
 * </pre>
 * Nothing in Redis expires, so every finished job must be cleaned up.
 */
public interface EngineQueue {

    void submit(String jobJson);

    /** The job's state hash ({@code status}, {@code progress}, {@code partial}, ...); empty if absent. */
    Map<String, String> jobState(String jobId);

    Optional<String> partial(String jobId);

    Optional<String> result(String jobId);

    void cancel(String jobId);

    void cleanup(String jobId);
}
