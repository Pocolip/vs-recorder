package com.yeskatronics.vs_recorder_backend.performance;

import com.sun.net.httpserver.HttpServer;
import com.yeskatronics.vs_recorder_backend.config.RestTemplateConfig;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;
import java.net.InetSocketAddress;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;

class ExternalHttpTimeoutTest {
    @Test void stalledUpstreamHitsConfiguredReadTimeout() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var worker = java.util.concurrent.Executors.newSingleThreadExecutor();
        server.setExecutor(worker);
        server.createContext("/slow", exchange -> {
            try { Thread.sleep(2000); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
            finally { exchange.close(); }
        });
        server.start();
        try {
            var client = new RestTemplateConfig().restTemplate(Duration.ofMillis(100), Duration.ofMillis(100));
            assertTimeoutPreemptively(Duration.ofSeconds(1), () -> assertThrows(ResourceAccessException.class,
                    () -> client.getForObject("http://127.0.0.1:" + server.getAddress().getPort() + "/slow", String.class)));
        } finally { server.stop(0); worker.shutdownNow(); }
    }
}
