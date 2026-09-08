package com.vuokraappi.dto.listing;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class GenerateListingRequest {

    @NotBlank(message = "Postinumero on pakollinen")
    @Pattern(regexp = "^\\d{5}$", message = "Postinumeron tulee olla 5 numeroa")
    @JsonProperty("zipcode")
    private String zipcode;

    @NotBlank(message = "Kaupunki on pakollinen")
    @JsonProperty("city")
    private String city;

    @NotBlank(message = "Katuosoite on pakollinen")
    @JsonProperty("street_address")
    private String streetAddress;

    @Min(value = 1, message = "Huoneluvun tulee olla vähintään 1")
    @Max(value = 10, message = "Huoneluvun tulee olla enintään 10")
    @JsonProperty("rooms")
    private int rooms;

    @DecimalMin(value = "10.0", message = "Koon tulee olla vähintään 10 m²")
    @DecimalMax(value = "500.0", message = "Koon tulee olla enintään 500 m²")
    @JsonProperty("size")
    private double size;

    @Min(value = 0, message = "Kerroksen tulee olla vähintään 0")
    @JsonProperty("floor")
    private int floor;

    @Min(value = 1800, message = "Rakennusvuoden tulee olla vähintään 1800")
    @JsonProperty("build_year")
    private int buildYear;

    // Vapaaehtoinen lisätieto esim. "sauna, parveke, hissi"
    @JsonProperty("additional_info")
    private String additionalInfo;
}