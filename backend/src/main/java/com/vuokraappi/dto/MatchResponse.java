package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchResponse {

    @JsonProperty("id")
    private UUID id;

    @JsonProperty("tenantId")
    private UUID tenantId;

    @JsonProperty("tenantName")
    private String tenantName;

    @JsonProperty("apartmentId")
    private UUID apartmentId;

    @JsonProperty("apartmentAddress")
    private String apartmentAddress;

    @JsonProperty("landlordId")
    private UUID landlordId;

    @JsonProperty("matchedAt")
    private LocalDateTime matchedAt;
}
