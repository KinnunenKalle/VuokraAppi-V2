package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateRequest {
    
    // User fields
    @JsonProperty("firstName")
    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;
    
    @JsonProperty("lastName")
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;
    
    @JsonProperty("phoneNumber")
    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phoneNumber;
    
    @JsonProperty("email")
    @Email(message = "Email must be valid")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;
    
    @JsonProperty("introduction")
    @Size(max = 2000, message = "Introduction must not exceed 2000 characters")
    private String introduction;
    
    @JsonProperty("dateOfBirth")
    private LocalDate dateOfBirth;
    
    // Tenant-specific fields
    @JsonProperty("occupation")
    @Size(max = 100, message = "Occupation must not exceed 100 characters")
    private String occupation;
    
    @JsonProperty("monthlyIncome")
    private Integer monthlyIncome;
    
    @JsonProperty("currentAddress")
    @Size(max = 255, message = "Current address must not exceed 255 characters")
    private String currentAddress;
    
    @JsonProperty("pet")
    @Size(max = 100, message = "Pet must not exceed 100 characters")
    private String pet;
    
    // Landlord-specific fields
    @JsonProperty("companyName")
    @Size(max = 200, message = "Company name must not exceed 200 characters")
    private String companyName;
    
    @JsonProperty("businessId")
    @Size(max = 50, message = "Business ID must not exceed 50 characters")
    private String businessId;
    
    @JsonProperty("bankAccount")
    @Size(max = 100, message = "Bank account must not exceed 100 characters")
    private String bankAccount;
}
