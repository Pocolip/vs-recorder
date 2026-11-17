package com.yeskatronics.vs_recorder_backend.engine;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.awscore.exception.AwsServiceException;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.StartInstancesRequest;

import java.util.List;
import java.util.function.Supplier;

/**
 * Starts the first worker instance with {@code ec2:StartInstances}.
 *
 * The client is created on first use, so the SDK costs nothing until a job runs. It
 * uses the JDK's URL connection client and the default credentials chain (the
 * instance role, through IMDS).
 *
 * Starting a running instance does nothing. Starting one that is shutting down fails
 * with {@code IncorrectInstanceState}; that's expected and retried on the next poll.
 */
@Slf4j
public class Ec2WorkerStarter implements WorkerStarter, AutoCloseable {

    static final String INCORRECT_INSTANCE_STATE = "IncorrectInstanceState";

    private final List<String> instanceIds;
    private final Supplier<Ec2Client> clientFactory;
    private volatile Ec2Client client;
    private volatile boolean warnedNoInstances;

    public Ec2WorkerStarter(List<String> instanceIds, String region) {
        this(instanceIds, () -> Ec2Client.builder()
                .region(Region.of(region))
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build());
    }

    Ec2WorkerStarter(List<String> instanceIds, Supplier<Ec2Client> clientFactory) {
        this.instanceIds = instanceIds == null ? List.of() : instanceIds.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        this.clientFactory = clientFactory;
    }

    @Override
    public void start() {
        if (instanceIds.isEmpty()) {
            if (!warnedNoInstances) {
                warnedNoInstances = true;
                log.warn("No engine worker instance IDs configured; not starting a worker");
            }
            return;
        }
        // Only AWS error codes are logged: no instance IDs, ARNs or raw SDK messages.
        try {
            client().startInstances(StartInstancesRequest.builder().instanceIds(instanceIds.get(0)).build());
            log.debug("Requested start of the engine worker");
        } catch (AwsServiceException e) {
            String code = e.awsErrorDetails() != null ? e.awsErrorDetails().errorCode() : null;
            if (INCORRECT_INSTANCE_STATE.equals(code)) {
                log.debug("Engine worker can't start yet ({}); retrying next poll", code);
            } else {
                log.error("Failed to start the engine worker: AWS error {} (HTTP {})", code, e.statusCode());
            }
        } catch (RuntimeException e) {
            log.error("Failed to start the engine worker: {}", e.getClass().getSimpleName());
        }
    }

    private Ec2Client client() {
        Ec2Client c = client;
        if (c == null) {
            synchronized (this) {
                c = client;
                if (c == null) {
                    c = clientFactory.get();
                    client = c;
                }
            }
        }
        return c;
    }

    @Override
    public void close() {
        Ec2Client c = client;
        if (c != null) {
            c.close();
        }
    }
}
