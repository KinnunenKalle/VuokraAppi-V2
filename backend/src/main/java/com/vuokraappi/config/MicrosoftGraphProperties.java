package com.vuokraappi.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "microsoft.graph.api")
@Data
public class MicrosoftGraphProperties {
    
    private String baseUrl;
    private Integer timeout;
}
