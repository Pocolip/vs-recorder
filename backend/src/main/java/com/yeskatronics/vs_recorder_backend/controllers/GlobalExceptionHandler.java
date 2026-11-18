package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.exceptions.RateLimitExceededException;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationConflictException;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationNotFoundException;
import com.yeskatronics.vs_recorder_backend.exceptions.SimulationUnavailableException;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

/**
 * Global exception handler for all REST controllers.
 * Provides consistent error responses across the application.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Handle validation errors from @Valid annotations
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex,
            WebRequest request) {

        log.warn("Validation error: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Validation Failed",
                "Request validation failed",
                request.getDescription(false).replace("uri=", "")
        );

        // Add field-specific validation errors
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            error.addValidationError(fieldError.getField(), fieldError.getDefaultMessage());
        }

        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handle IllegalArgumentException (business logic errors)
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex,
            WebRequest request) {

        log.warn("Illegal argument: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(),
                request.getDescription(false).replace("uri=", "")
        );

        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handle team access denied (collaborator missing permission, or non-member access).
     */
    @ExceptionHandler(TeamAccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleTeamAccessDenied(
            TeamAccessDeniedException ex,
            WebRequest request) {

        log.warn("Team access denied: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                ex.getMessage(),
                request.getDescription(false).replace("uri=", "")
        );

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    /**
     * Handle a simulation that can't be submitted now. {@code error} carries the
     * conflict's code so the client can tell the cases apart.
     */
    @ExceptionHandler(SimulationConflictException.class)
    public ResponseEntity<ErrorResponse> handleSimulationConflict(
            SimulationConflictException ex,
            WebRequest request) {

        log.info("Simulation conflict: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                ex.getCode(),
                ex.getMessage(),
                request.getDescription(false).replace("uri=", "")
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    /**
     * Handle a missing simulation result.
     */
    @ExceptionHandler(SimulationNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleSimulationNotFound(
            SimulationNotFoundException ex,
            WebRequest request) {

        ErrorResponse error = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage(),
                request.getDescription(false).replace("uri=", "")
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    /**
     * Handle the engine's queue being unreachable.
     */
    @ExceptionHandler(SimulationUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleSimulationUnavailable(
            SimulationUnavailableException ex,
            WebRequest request) {

        ErrorResponse error = new ErrorResponse(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                "Service Unavailable",
                ex.getMessage(),
                request.getDescription(false).replace("uri=", "")
        );

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }

    /**
     * Handle rate limits (e.g. the daily simulation cap).
     */
    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimitExceeded(
            RateLimitExceededException ex,
            WebRequest request) {

        log.info("Rate limit exceeded: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "Too Many Requests",
                ex.getMessage(),
                request.getDescription(false).replace("uri=", "")
        );

        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(error);
    }

    /**
     * Handle generic exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex,
            WebRequest request) {

        log.error("Unexpected error: ", ex);

        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                "An unexpected error occurred. Please try again later.",
                request.getDescription(false).replace("uri=", "")
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}