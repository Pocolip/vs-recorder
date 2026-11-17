package com.yeskatronics.vs_recorder_backend.exceptions;

/**
 * A simulation can't be submitted in the team's current state. Translates to HTTP 409.
 * {@link #getCode()} lets the client tell the cases apart.
 */
public class SimulationConflictException extends RuntimeException {

    /** A job for this team is still queued or running. */
    public static final String UNFINISHED = "simulation_unfinished";
    /** The latest complete result already used this exact paste. Resubmit with force to re-run. */
    public static final String UNCHANGED = "simulation_unchanged";

    private final String code;

    public SimulationConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
