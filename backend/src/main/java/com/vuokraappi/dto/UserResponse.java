package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.vuokraappi.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    
    @JsonProperty("id")
    private UUID id;
    
    @JsonProperty("role")
    private UserRole role;
    
    @JsonProperty("createdAt")
    private LocalDateTime createdAt;
    
    @JsonProperty("isActive")
    private Boolean isActive;
}
