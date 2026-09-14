package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vastaus vuokranantajan swipe-toiminnolle (vuokralaisesta, tietyn asunnon suhteen).
 * matched/matchId kertovat syntyikö tästä swipesta molemminpuolinen match.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LandlordSwipeResponse {

    @JsonProperty("id")
    private UUID id;

    @JsonProperty("tenantId")
    private UUID tenantId;

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
