package com.yeskatronics.vs_recorder_backend.engine;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;
import java.util.List;

/**
 * Settings for matchup engine jobs (the "Simulated" analytics).
 *
 * Values come from the environment in production (see docker-compose.prod.yml);
 * the defaults in application.properties keep the feature off.
 *
 * @param enabled           master switch (ENGINE_JOBS_ENABLED). Off: no Redis, no EC2, no poller.
 * @param redisUrl          redis:// or rediss:// URL of the job queue (REDIS_URL)
 * @param queuePrefix       key prefix shared with the engine's worker
 * @param workerInstanceIds EC2 instance IDs of the engine's workers; the first is started
 * @param awsRegion         region of the workers
 * @param allowedUsers      usernames allowed to run jobs (exact match, as usernames are); empty means
 *                          nobody, and {@code *} means every signed-in user (who owns the team)
 * @param dailyCap          simulations (Simulated analytics) a user may submit per UTC day
 * @param planDailyCap      Matchup Planner plans a user may submit per UTC day, one per entry.
 *                          Separate because plans are cheap and come in batches.
 * @param globalDailyCap    simulations everyone together may submit per UTC day; 0 for no limit.
 *                          Bounds what a day can cost once the feature is open to everyone.
 * @param globalPlanDailyCap the same for Matchup Planner plans; 0 for no limit
 * @param feedbackUrl       optional http(s) link the Simulations modal offers for feedback
 * @param staleTimeout      a job with no change in status or progress for this long is failed
 */
@ConfigurationProperties(prefix = "engine")
public record EngineProperties(
        @DefaultValue("false") boolean enabled,
        @DefaultValue("redis://localhost:6379/0") String redisUrl,
        @DefaultValue("vsr") String queuePrefix,
        @DefaultValue List<String> workerInstanceIds,
        @DefaultValue("us-east-1") String awsRegion,
        @DefaultValue List<String> allowedUsers,
        @DefaultValue("3") int dailyCap,
        @DefaultValue("20") int planDailyCap,
        @DefaultValue("0") int globalDailyCap,
        @DefaultValue("0") int globalPlanDailyCap,
        @DefaultValue("") String feedbackUrl,
        @DefaultValue("PT3H") Duration staleTimeout
) {

    /** The allowlist is {@code *}: every signed-in user may run jobs on teams they own. */
    public static final String EVERYONE = "*";

    public boolean openToAll() {
        return allowedUsers != null && allowedUsers.stream().map(String::trim).anyMatch(EVERYONE::equals);
    }

    public boolean isAllowed(String username) {
        if (username == null || username.isBlank() || allowedUsers == null) {
            return false;
        }
        if (openToAll()) {
            return true;
        }
        return allowedUsers.stream()
                .map(String::trim)
                .anyMatch(u -> !u.isEmpty() && u.equals(username));
    }

    /** The feedback link if it's an http(s) URL, else null (nothing else is shown to users). */
    public String safeFeedbackUrl() {
        if (feedbackUrl == null) {
            return null;
        }
        String url = feedbackUrl.trim();
        return url.startsWith("https://") || url.startsWith("http://") ? url : null;
    }
}
