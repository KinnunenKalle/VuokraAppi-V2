package com.vuokraappi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vuokraappi.ai.ApartmentListingAgent;
import com.vuokraappi.dto.listing.GenerateListingResponse;
import com.vuokraappi.dto.listing.SaveListingRequest;
import com.vuokraappi.entity.Apartment;
import com.vuokraappi.entity.User;
import com.vuokraappi.exception.ResourceNotFoundException;
import com.vuokraappi.exception.UnauthorizedException;
import com.vuokraappi.repository.ApartmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ListingService {

    private final ApartmentListingAgent apartmentListingAgent;
    private final ApartmentRepository apartmentRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public GenerateListingResponse generateAndSave(UUID apartmentId, SaveListingRequest request, User currentUser) {
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Asuntoa ei löydy id:llä: " + apartmentId));

        if (!apartment.getOwner().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Voit generoida ilmoituksen vain omille asunnoillesi");
        }

        log.info("Generating listing for apartment {}, rooms={}, floor={}, buildYear={}",
                apartmentId, request.getRooms(), request.getFloor(), request.getBuildYear());

        String rawJson = apartmentListingAgent.generateListing(
                apartment.getZipcode(),
                apartment.getCity(),
                apartment.getStreetAddress(),
                request.getRooms(),
                apartment.getSize(),
                request.getFloor(),
                request.getBuildYear(),
                request.getAdditionalInfo() != null ? request.getAdditionalInfo() : ""
        );

        GenerateListingResponse response = parseAgentResponse(rawJson);
        response.setListingGeneratedAt(LocalDateTime.now());

        apartment.setListingText(response.getListingText());
        apartment.setListingGeneratedAt(response.getListingGeneratedAt());
        if (response.getRentSuggestion() != null) {
            apartment.setRentSuggestionMin(response.getRentSuggestion().getMin());
            apartment.setRentSuggestionMax(response.getRentSuggestion().getMax());
            apartment.setRentSuggestionRecommended(response.getRentSuggestion().getRecommended());
            apartment.setRentSuggestionReasoning(response.getRentSuggestion().getReasoning());
        }
        apartmentRepository.save(apartment);

        log.info("Listing saved for apartment {}", apartmentId);
        return response;
    }

    private GenerateListingResponse parseAgentResponse(String raw) {
        try {
            // Agentti saattaa kääriä JSON:n markdown-koodilohkoon
            String json = raw.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("(?s)```[a-z]*\\s*", "").replaceAll("```", "").trim();
            }
            return objectMapper.readValue(json, GenerateListingResponse.class);
        } catch (Exception e) {
            log.error("Failed to parse agent JSON response, returning raw text: {}", raw, e);
            GenerateListingResponse fallback = new GenerateListingResponse();
            fallback.setListingText(raw);
            return fallback;
        }
    }
}
