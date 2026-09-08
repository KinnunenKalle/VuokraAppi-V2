package com.vuokraappi.dto.listing;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GenerateListingResponse {

    @JsonProperty("listingText")
    private String listingText;

    @JsonProperty("rentSuggestion")
    private RentSuggestion rentSuggestion;

    @JsonProperty("listingGeneratedAt")
    private LocalDateTime listingGeneratedAt;

    @Data
    public static class RentSuggestion {

        @JsonProperty("min")
        private Integer min;

        @JsonProperty("max")
        private Integer max;

        @JsonProperty("recommended")
        private Integer recommended;

        @JsonProperty("reasoning")
        private String reasoning;
    }
}
