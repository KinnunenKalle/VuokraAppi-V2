package com.vuokraappi.config;

import com.vuokraappi.ai.ApartmentListingAgent;
import com.vuokraappi.ai.ListingTools;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.service.AiServices;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AiConfig {

    @Value("${openai.api.key}")
    private String openAiApiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String modelName;

    @Bean
    public OpenAiChatModel openAiChatModel() {
        return OpenAiChatModel.builder()
                .apiKey(openAiApiKey)
                .modelName(modelName)
                .temperature(0.3)
                .maxTokens(2000)
                .build();
    }

    @Bean
    public ApartmentListingAgent apartmentListingAgent(
            OpenAiChatModel chatModel,
            ListingTools listingTools) {

        return AiServices.builder(ApartmentListingAgent.class)
                .chatLanguageModel(chatModel)
                .tools(listingTools)
                .build();
    }

    /**
     * WebClient Nominatim-geocoding-palvelulle (OpenStreetMap).
     * Usage policy: max 1 req/s, User-Agent pakollinen.
     */
    @Bean(name = "nominatimWebClient")
    public WebClient nominatimWebClient() {
        return WebClient.builder()
                .baseUrl("https://nominatim.openstreetmap.org")
                .defaultHeader("Accept", "application/json")
                .codecs(config -> config.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();
    }

    /**
     * WebClient Overpass API:lle (OpenStreetMap lähipalvelut).
     */
    @Bean(name = "overpassWebClient")
    public WebClient overpassWebClient() {
        return WebClient.builder()
                .baseUrl("https://overpass-api.de")
                .defaultHeader("Accept", "application/json")
                .codecs(config -> config.defaultCodecs().maxInMemorySize(5 * 1024 * 1024))
                .build();
    }

    @Bean(name = "statFinWebClient")
    public WebClient statFinWebClient() {
        return WebClient.builder()
                .baseUrl("https://pxdata.stat.fi")
                .defaultHeader("Accept", "application/json")
                .codecs(config -> config.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build();
    }
}