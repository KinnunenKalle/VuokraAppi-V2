package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Swipe-pyyntö: true = kiinnostaa (like), false = ei kiinnosta (pass).
 * Uudelleen-swaippaus samaan kohteeseen päivittää edellisen valinnan.
 */
@Data
public class SwipeRequest {

    @NotNull(message = "liked on pakollinen")
    @JsonProperty("liked")
    private Boolean liked;
}
