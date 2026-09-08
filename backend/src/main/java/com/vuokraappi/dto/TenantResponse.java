package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TenantResponse {

    @JsonProperty("id")
    private UUID id;

    @JsonProperty("firstName")
    private String firstName;

    @JsonProperty("lastName")
    private String lastName;

    @JsonProperty("email")
    private String email;

    @JsonProperty("phoneNumber")
    private String phoneNumber;

    @JsonProperty("introduction")
    private String introduction;

    @JsonProperty("dateOfBirth")
    private LocalDate dateOfBirth;

    @JsonProperty("age")
    private Integer age;

    // Tenant-specific fields
    @JsonProperty("occupation")
    private String occupation;

    @JsonProperty("monthlyIncome")
    private Integer monthlyIncome;

    @JsonProperty("currentAddress")
    private String currentAddress;

    @JsonProperty("pet")
    private String pet;

    @JsonProperty("identityVerified")
    private Boolean identityVerified;
}