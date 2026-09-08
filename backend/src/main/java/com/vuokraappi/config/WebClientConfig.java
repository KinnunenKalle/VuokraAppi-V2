package com.vuokraappi.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.*;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.reactive.function.client.ServletOAuth2AuthorizedClientExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {
    
    /**
     * OAuth2AuthorizedClientManager hallinnoi OAuth2 Client Credentials Flow tokenien hakemista ja cachettamista
     */
    @Bean
    public OAuth2AuthorizedClientManager authorizedClientManager(
            ClientRegistrationRepository clientRegistrationRepository,
            OAuth2AuthorizedClientService authorizedClientService) {
        
        OAuth2AuthorizedClientProvider authorizedClientProvider =
            OAuth2AuthorizedClientProviderBuilder.builder()
                .clientCredentials()
                .build();
        
        AuthorizedClientServiceOAuth2AuthorizedClientManager authorizedClientManager =
            new AuthorizedClientServiceOAuth2AuthorizedClientManager(
                clientRegistrationRepository, 
                authorizedClientService
            );
        
        authorizedClientManager.setAuthorizedClientProvider(authorizedClientProvider);
        
        return authorizedClientManager;
    }
    
    /**
     * WebClient automaattisella OAuth2 token -hallinnalla
     */
    @Bean
    public WebClient graphApiWebClient(OAuth2AuthorizedClientManager authorizedClientManager,
                                       MicrosoftGraphProperties graphProperties) {
        
        ServletOAuth2AuthorizedClientExchangeFilterFunction oauth2 =
            new ServletOAuth2AuthorizedClientExchangeFilterFunction(authorizedClientManager);
        
        // Asetetaan default client registration ID
        oauth2.setDefaultClientRegistrationId("graph");
        
        return WebClient.builder()
            .baseUrl(graphProperties.getBaseUrl())
            .apply(oauth2.oauth2Configuration())
            .build();
    }

    @Bean
    public WebClient signicatWebClient() {
        return WebClient.builder().build();
    }
}
