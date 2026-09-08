package com.vuokraappi.controller;

import com.vuokraappi.config.UserPrincipal;
import com.vuokraappi.dto.ApartmentRequest;
import com.vuokraappi.dto.ApartmentResponse;
import com.vuokraappi.dto.ApartmentSearchCriteria;
import com.vuokraappi.entity.User;
import com.vuokraappi.service.ApartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/apartments")
@RequiredArgsConstructor
public class ApartmentController {
    
    private final ApartmentService apartmentService;
    
    @GetMapping
    public Mono<ResponseEntity<List<ApartmentResponse>>> getAllApartments() {
        return Mono.fromCallable(() -> apartmentService.getAllApartments())
                .map(ResponseEntity::ok);
    }

    /**
     * Hakee asuntoja query parametrien perusteella.
     * Kaikki parametrit ovat optionaalisia.
     * 
     * Esimerkki: GET /apartments/search?city=Helsinki&minSize=40&maxRent=1200
     */
    @GetMapping("/search")
    public Mono<ResponseEntity<List<ApartmentResponse>>> searchApartments(
            @RequestParam(required = false) String zipcode,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) Double minSize,
            @RequestParam(required = false) Double maxSize,
            @RequestParam(required = false) BigDecimal minRent,
            @RequestParam(required = false) BigDecimal maxRent,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double radiusKm) {
        
        ApartmentSearchCriteria criteria = ApartmentSearchCriteria.builder()
                .zipcode(zipcode)
                .city(city)
                .region(region)
                .minSize(minSize)
                .maxSize(maxSize)
                .minRent(minRent)
                .maxRent(maxRent)
                .latitude(latitude)
                .longitude(longitude)
                .radiusKm(radiusKm)
                .build();
        
        return Mono.fromCallable(() -> apartmentService.searchApartments(criteria))
                .map(ResponseEntity::ok);
    }
    
    @GetMapping("/{id}")
    public Mono<ResponseEntity<ApartmentResponse>> getApartmentById(@PathVariable UUID id) {
        return Mono.fromCallable(() -> apartmentService.getApartmentById(id))
                .map(ResponseEntity::ok);
    }
    
    @PostMapping
    public Mono<ResponseEntity<ApartmentResponse>> createApartment(
            @Valid @RequestBody ApartmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return Mono.fromCallable(() -> apartmentService.createApartment(request, principal.getUser()))
                .map(apartment -> ResponseEntity.status(HttpStatus.CREATED).body(apartment));
    }
    
    @PatchMapping("/{id}")
    public Mono<ResponseEntity<ApartmentResponse>> updateApartment(
            @PathVariable UUID id,
            @Valid @RequestBody ApartmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return Mono.fromCallable(() -> apartmentService.updateApartment(id, request, principal.getUser()))
                .map(ResponseEntity::ok);
    }
    
    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Void>> deleteApartment(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return Mono.fromRunnable(() -> apartmentService.deleteApartment(id, principal.getUser()))
                .then(Mono.just(ResponseEntity.noContent().<Void>build()));
    }
}