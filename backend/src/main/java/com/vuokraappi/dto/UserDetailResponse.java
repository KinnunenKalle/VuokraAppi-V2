package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.vuokraappi.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailResponse {
    
    @JsonProperty("id")
    private UUID id;
    
    @JsonProperty("role")
    private UserRole role;
    
    @JsonProperty("firstName")
    private String firstName;
    
    @JsonProperty("lastName")
    private String lastName;
    
    @JsonProperty("phoneNumber")
    private String phoneNumber;
    
    @JsonProperty("email")
    private String email;
    
    @JsonProperty("introduction")
    private String introduction;
    
    @JsonProperty("dateOfBirth")
    private LocalDate dateOfBirth;
    
    @JsonProperty("identityVerified")
    private Boolean identityVerified;

    @JsonProperty("identityVerifiedAt")
    private LocalDateTime identityVerifiedAt;

    @JsonProperty("createdAt")
    private LocalDateTime createdAt;
    
    @JsonProperty("updatedAt")
    private LocalDateTime updatedAt;
    
    @JsonProperty("isActive")
    private Boolean isActive;
    
    // Tenant-specific fields
    @JsonProperty("occupation")
    private String occupation;
    
    @JsonProperty("monthlyIncome")
    private Integer monthlyIncome;
    
    @JsonProperty("currentAddress")
    private String currentAddress;
    
    @JsonProperty("pet")
    private String pet;
    
    // Landlord-specific fields
    @JsonProperty("companyName")
    private String companyName;
    
    @JsonProperty("businessId")
    private String businessId;
    
    @JsonProperty("bankAccount")
    private String bankAccount;
}
