package com.vuokraappi.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestTemplateConfig {
    
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder, 
                                     MicrosoftGraphProperties graphProperties) {
        return builder
                .setConnectTimeout(Duration.ofMillis(graphProperties.getTimeout()))
                .setReadTimeout(Duration.ofMillis(graphProperties.getTimeout()))
                .build();
    }
}
