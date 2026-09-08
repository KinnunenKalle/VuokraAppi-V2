package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Palautetaan yksittäistä kuvaa kuvaavat tiedot.
 *
 * Huomio: url on SAS URL joka vanhenee. Asiakassovelluksen ei pidä cachettaa
 * tätä URL:ia pitkäksi aikaa – pyydä uusi listaamalla kuvat uudelleen.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApartmentImageResponse {

    @JsonProperty("id")
    private UUID id;

    /** Lyhytikäinen SAS URL kuvaan. Voimassa azure.storage.sas-expiration-hours tunnin. */
    @JsonProperty("url")
    private String url;

    @JsonProperty("filename")
    private String filename;

    @JsonProperty("contentType")
    private String contentType;

    @JsonProperty("fileSizeBytes")
    private Long fileSizeBytes;

    @JsonProperty("sortOrder")
    private Integer sortOrder;

    @JsonProperty("isPrimary")
    private Boolean isPrimary;

    @JsonProperty("uploadedAt")
    private LocalDateTime uploadedAt;
}