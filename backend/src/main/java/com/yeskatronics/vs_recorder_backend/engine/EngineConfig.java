package com.yeskatronics.vs_recorder_backend.engine;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires the matchup engine's queue and worker starter. Both exist only when
 * {@code engine.enabled=true}; with the feature off nothing connects to Redis or AWS.
 */
@Configuration
@EnableConfigurationProperties(EngineProperties.class)
public class EngineConfig {

    // Closed on shutdown through the inferred destroy method (AutoCloseable).
    @Bean
    @ConditionalOnProperty(name = "engine.enabled", havingValue = "true")
    public EngineQueue engineQueue(EngineProperties properties) {
        return new JedisEngineQueue(properties.redisUrl(), properties.queuePrefix());
    }

    @Bean
    @ConditionalOnProperty(name = "engine.enabled", havingValue = "true")
    public WorkerStarter workerStarter(EngineProperties properties) {
        return new Ec2WorkerStarter(properties.workerInstanceIds(), properties.awsRegion());
    }
}
