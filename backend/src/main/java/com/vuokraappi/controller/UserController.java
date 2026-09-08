package com.vuokraappi.controller;

import com.vuokraappi.dto.ApartmentResponse;
import com.vuokraappi.dto.TenantResponse;
import com.vuokraappi.dto.UserDetailResponse;
import com.vuokraappi.dto.UserRegistrationRequest;
import com.vuokraappi.dto.UserResponse;
import com.vuokraappi.dto.UserUpdateRequest;
import com.vuokraappi.service.ApartmentService;
import com.vuokraappi.service.TenantSearchService;
import com.vuokraappi.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {
    
    private final UserService userService;
    private final ApartmentService apartmentService;
    private final TenantSearchService tenantSearchService;
    
    @PostMapping
    public ResponseEntity<UserResponse> registerUser(
            @Valid @RequestBody UserRegistrationRequest request) {
        
        log.info("Received user registration request for ID: {}", request.getId());
        
        UserResponse response = userService.registerUser(request);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @GetMapping("/{userId}")
    public ResponseEntity<UserDetailResponse> getUser(@PathVariable UUID userId) {
        
        log.info("Received request to fetch user with ID: {}", userId);
        
        UserDetailResponse response = userService.getUser(userId);
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{userId}/apartments")
    public ResponseEntity<List<ApartmentResponse>> getUserApartments(@PathVariable UUID userId) {
        
        log.info("Received request to fetch apartments for user: {}", userId);
        
        List<ApartmentResponse> apartments = apartmentService.getApartmentsByUserId(userId);
        
        return ResponseEntity.ok(apartments);
    }
    
    @GetMapping("/{userId}/tenants/search")
    public ResponseEntity<List<TenantResponse>> searchTenants(
            @PathVariable UUID userId,
            @RequestParam(required = false) Integer minIncome,
            @RequestParam(required = false) Integer maxIncome,
            @RequestParam(required = false) String occupation,
            @RequestParam(required = false) Boolean hasPet,
            @RequestParam(required = false) Integer minAge,
            @RequestParam(required = false) Integer maxAge,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Boolean identityVerified) {

        log.info("Received tenant search request from landlord: {}", userId);

        // TODO: Varmista että userId on landlord (jos halutaan rajoittaa)

        List<TenantResponse> tenants = tenantSearchService.searchTenants(
                minIncome, maxIncome, occupation, hasPet, minAge, maxAge, city, identityVerified);

        return ResponseEntity.ok(tenants);
    }
    
    @PatchMapping("/{userId}")
    public ResponseEntity<UserDetailResponse> updateUser(
            @PathVariable UUID userId,
            @Valid @RequestBody UserUpdateRequest request) {
        
        log.info("Received request to update user with ID: {}", userId);
        
        UserDetailResponse response = userService.updateUser(userId, request);
        
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID userId) {
        
        log.info("Received user deletion request for ID: {}", userId);
        
        userService.deleteUser(userId);
        
        return ResponseEntity.noContent().build();
    }
}