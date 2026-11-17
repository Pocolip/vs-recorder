package com.yeskatronics.vs_recorder_backend.exceptions;

/**
 * The team has no simulation result to show, or engine jobs are off. Translates to HTTP 404.
 */
public class SimulationNotFoundException extends RuntimeException {
    public SimulationNotFoundException(String message) {
        super(message);
    }
}
