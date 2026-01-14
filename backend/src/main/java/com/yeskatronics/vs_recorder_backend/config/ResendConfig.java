package com.yeskatronics.vs_recorder_backend.config;

import com.resend.Resend;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for Resend email client.
 */
@Configuration
public class ResendConfig {

    @Value("${resend.api-key}")
    private String resendApiKey;

    @Bean
    public Resend resend() {
        return new Resend(resendApiKey);
    }
}
