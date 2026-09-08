package com.vuokraappi.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "azure.storage")
@Data
public class BlobStorageProperties {

    /** Azure Storage connection string, haetaan ympäristömuuttujasta AZURE_STORAGE_CONNECTION_STRING */
    private String connectionString;

    /** Blob container nimi, esim. "apartment-images" */
    private String containerName;

    /**
     * SAS URL:n voimassaoloaika tunteina.
     * Lyhyt aika (esim. 1h) on turvallisempi, mutta vaatii useampia uusintoja.
     * Aseta pidemmäksi (esim. 24h) jos kuvat embedataan sähköposteihin tms.
     */
    private int sasExpirationHours = 1;

    /**
     * Suurin sallittu tiedostokoko tavuina. Oletuksena 10 MB.
     */
    private long maxFileSizeBytes = 10 * 1024 * 1024;

    /**
     * Suurin sallittu kuvamäärä per asunto.
     */
    private int maxImagesPerApartment = 10;
}