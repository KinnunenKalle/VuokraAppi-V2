package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * PATCH-pyyntö kuvan metadatan päivitystä varten.
 * Kaikki kentät ovat optionaalisia.
 *
 * Esimerkkikäyttö:
 * - Aseta pääkuvaksi:      { "isPrimary": true }
 * - Vaihda järjestystä:    { "sortOrder": 2 }
 */
@Data
public class ApartmentImageUpdateRequest {

    /**
     * Aseta tämä kuva asunnon pääkuvaksi.
     * Palvelu nollaa muiden kuvien isPrimary-flagin automaattisesti.
     */
    @JsonProperty("isPrimary")
    private Boolean isPrimary;

    /**
     * Uusi näyttöjärjestys. 0 = ensimmäinen.
     * Arvot eivät tarvitse olla peräkkäisiä – palvelu järjestää kuvat sort_order mukaan.
     */
    @JsonProperty("sortOrder")
    @Min(value = 0, message = "sortOrder ei voi olla negatiivinen")
    private Integer sortOrder;
}