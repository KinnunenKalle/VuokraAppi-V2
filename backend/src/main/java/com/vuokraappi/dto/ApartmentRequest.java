package com.vuokraappi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApartmentRequest {

    private String zipcode;
    private String streetAddress;
    private String city;
    private String region;
    private Double size;
    private Double longitude;
    private Double latitude;
    private BigDecimal rent;
}