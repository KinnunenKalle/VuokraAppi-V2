package com.vuokraappi.controller;

import com.vuokraappi.ai.ApartmentListingAgent;
import com.vuokraappi.dto.listing.GenerateListingRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/listings")
@RequiredArgsConstructor
@Slf4j
public class ListingController {

    private final ApartmentListingAgent apartmentListingAgent;

    /**
     * Generoi vuokrailmoituksen ja vuokrasuosituksen asunnon perustietojen perusteella.
     *
     * POST /listings/generate
     *
     * Palauttaa JSON-merkkijonon suoraan agentilta.
     * TODO: Parsoi JSON ListingResponse-DTO:ksi kun rakenne on vakiintunut.
     */
    @PostMapping("/v1/generate")
    public ResponseEntity<String> generateListing(
            @Valid @RequestBody GenerateListingRequest request) {

        log.info("Generating listing for apartment: zipcode={}, rooms={}, size={}",
                request.getZipcode(), request.getRooms(), request.getSize());

        String result = apartmentListingAgent.generateListing(
                request.getZipcode(),
                request.getCity(),
                request.getStreetAddress(),
                request.getRooms(),
                request.getSize(),
                request.getFloor(),
                request.getBuildYear(),
                request.getAdditionalInfo() != null ? request.getAdditionalInfo() : ""
        );

        log.info("Listing generated successfully for zipcode={}", request.getZipcode());

        return ResponseEntity.ok(result);
    }
}