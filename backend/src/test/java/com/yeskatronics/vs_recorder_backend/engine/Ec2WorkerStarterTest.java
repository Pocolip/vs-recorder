package com.yeskatronics.vs_recorder_backend.engine;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.awscore.exception.AwsErrorDetails;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.Ec2Exception;
import software.amazon.awssdk.services.ec2.model.StartInstancesRequest;
import software.amazon.awssdk.services.ec2.model.StartInstancesResponse;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class Ec2WorkerStarterTest {

    private static Ec2Exception ec2Error(String code) {
        return (Ec2Exception) Ec2Exception.builder()
                .message(code)
                .awsErrorDetails(AwsErrorDetails.builder().errorCode(code).errorMessage(code).build())
                .build();
    }

    @Test
    void startsTheFirstWorker() {
        Ec2Client client = mock(Ec2Client.class);
        when(client.startInstances(any(StartInstancesRequest.class))).thenReturn(StartInstancesResponse.builder().build());

        new Ec2WorkerStarter(List.of(" i-first ", "i-second"), () -> client).start();

        ArgumentCaptor<StartInstancesRequest> request = ArgumentCaptor.forClass(StartInstancesRequest.class);
        verify(client).startInstances(request.capture());
        assertEquals(List.of("i-first"), request.getValue().instanceIds());
    }

    @Test
    void toleratesIncorrectInstanceState() {
        Ec2Client client = mock(Ec2Client.class);
        when(client.startInstances(any(StartInstancesRequest.class))).thenThrow(ec2Error("IncorrectInstanceState"));

        assertDoesNotThrow(() -> new Ec2WorkerStarter(List.of("i-1"), () -> client).start());
    }

    @Test
    void otherErrorsAreLoggedNotThrown() {
        Ec2Client client = mock(Ec2Client.class);
        when(client.startInstances(any(StartInstancesRequest.class)))
                .thenThrow(ec2Error("UnauthorizedOperation"))
                .thenThrow(new RuntimeException("no credentials"));

        Ec2WorkerStarter starter = new Ec2WorkerStarter(List.of("i-1"), () -> client);
        assertDoesNotThrow(starter::start);
        assertDoesNotThrow(starter::start);
    }

    @Test
    void createsTheClientLazilyAndOnce() {
        Ec2Client client = mock(Ec2Client.class);
        AtomicInteger created = new AtomicInteger();
        Ec2WorkerStarter starter = new Ec2WorkerStarter(List.of("i-1"), () -> {
            created.incrementAndGet();
            return client;
        });
        assertEquals(0, created.get());

        starter.start();
        starter.start();
        assertEquals(1, created.get());
        verify(client, times(2)).startInstances(any(StartInstancesRequest.class));
    }

    @Test
    void noInstancesIsANoOp() {
        AtomicInteger created = new AtomicInteger();
        Ec2WorkerStarter starter = new Ec2WorkerStarter(List.of(), () -> {
            created.incrementAndGet();
            return mock(Ec2Client.class);
        });
        starter.start();
        assertEquals(0, created.get());
    }
}
