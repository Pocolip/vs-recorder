package com.yeskatronics.vs_recorder_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for RestTemplate HTTP client.
 * Used for making external API calls to Pokemon Showdown and Pokepaste.
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(
            @org.springframework.beans.factory.annotation.Value("${external-http.connect-timeout:5s}") java.time.Duration connectTimeout,
            @org.springframework.beans.factory.annotation.Value("${external-http.read-timeout:15s}") java.time.Duration readTimeout) {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        return new RestTemplate(factory);
    }
}