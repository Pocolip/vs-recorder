package com.yeskatronics.vs_recorder_backend.exceptions;

@org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE)
public class UpstreamUnavailableException extends RuntimeException {
    public UpstreamUnavailableException(Throwable cause) {
        super("The replay provider is temporarily unavailable or timed out. Please retry.", cause);
    }
}
