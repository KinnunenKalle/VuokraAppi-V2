package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vastaus vuokralaisen swipe-toiminnolle.
 * matched/matchId kertovat syntyikö tästä swipesta molemminpuolinen match –
 * näitä ei täytetä listauskutsuissa, vain itse swipe-toiminnon vastauksessa.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantSwipeResponse {

    @JsonProperty("id")
    private UUID id;

    @JsonProperty("apartmentId")
    private UUID apartmentId;

    @JsonProperty("liked")
    private Boolean liked;

    @JsonProperty("matched")
    private Boolean matched;

    @JsonProperty("matchId")
    private UUID matchId;

    @JsonProperty("createdAt")
    private LocalDateTime createdAt;
}
