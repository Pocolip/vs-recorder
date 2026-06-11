package com.yeskatronics.vs_recorder_backend.exceptions;

/**
 * Thrown when the current user lacks the required permission on a team
 * (either because they are not a member at all, or because their collaborator
 * permissions don't grant the requested action). Translates to HTTP 403.
 */
public class TeamAccessDeniedException extends RuntimeException {
    public TeamAccessDeniedException(String message) {
        super(message);
    }
}
