package com.vuokraappi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Hakukriteerit asunnoille.
 * Kaikki kentät ovat optionaalisia - vain annetut kriteerit käytetään hakuun.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApartmentSearchCriteria {

    private String zipcode;
    private String city;
    private String region;
    
    // Size range
    private Double minSize;
    private Double maxSize;
    
    // Rent range
    private BigDecimal minRent;
    private BigDecimal maxRent;
    
    // Location-based search (coordinates + radius in km)
    private Double latitude;
    private Double longitude;
    private Double radiusKm;

    // Suodata vain vahvistetun identiteetin omaavien vuokranantajien asunnot
    private Boolean landlordIdentityVerified;
}