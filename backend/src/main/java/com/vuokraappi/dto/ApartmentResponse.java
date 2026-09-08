package com.vuokraappi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApartmentResponse {
    
    private UUID id;
    private UUID ownerId;
    private String ownerName;
    private String zipcode;
    private String streetAddress;
    private String city;
    private String region;
    private Double size;
    private Double longitude;
    private Double latitude;
    private BigDecimal rent;

    private Boolean ownerIdentityVerified;
}