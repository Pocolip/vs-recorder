package com.yeskatronics.vs_recorder_backend.exceptions;

/**
 * The engine's queue couldn't take a job right now. Translates to HTTP 503.
 */
public class SimulationUnavailableException extends RuntimeException {
    public SimulationUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
