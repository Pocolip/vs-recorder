package com.yeskatronics.vs_recorder_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ses.SesClient;

/**
 * Configuration for AWS SES email client.
 * Uses DefaultCredentialsProvider which supports:
 * - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - AWS credentials file (~/.aws/credentials)
 * - EC2 instance role (recommended for production)
 */
@Configuration
public class AwsSesConfig {

    @Value("${aws.ses.region:us-east-1}")
    private String awsRegion;

    @Bean
    public SesClient sesClient() {
        return SesClient.builder()
            .region(Region.of(awsRegion))
            .credentialsProvider(DefaultCredentialsProvider.create())
            .build();
    }
}
