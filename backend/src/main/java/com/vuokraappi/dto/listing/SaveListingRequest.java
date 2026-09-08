package com.vuokraappi.dto.listing;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SaveListingRequest {

    @Min(value = 1, message = "Huoneluvun tulee olla vähintään 1")
    @Max(value = 10, message = "Huoneluvun tulee olla enintään 10")
    @JsonProperty("rooms")
    private int rooms;

    @Min(value = 0, message = "Kerroksen tulee olla vähintään 0")
    @JsonProperty("floor")
    private int floor;

    @Min(value = 1800, message = "Rakennusvuoden tulee olla vähintään 1800")
    @JsonProperty("buildYear")
    private int buildYear;

    @JsonProperty("additionalInfo")
    private String additionalInfo;
}
