package com.vuokraappi.controller;

import com.vuokraappi.config.UserPrincipal;
import com.vuokraappi.dto.LandlordSwipeResponse;
import com.vuokraappi.dto.MatchResponse;
import com.vuokraappi.dto.SwipeRequest;
import com.vuokraappi.dto.TenantSwipeResponse;
import com.vuokraappi.service.LandlordSwipeService;
import com.vuokraappi.service.MatchService;
import com.vuokraappi.service.TenantSwipeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST API asuntoihin liittyville swipeille ja matcheille.
 *
 * Endpointit (kaikki vaativat kirjautumisen):
 *   POST   /v1/apartments/{id}/swipes                        – vuokralainen swaippaa asunnon
 *   DELETE /v1/apartments/{id}/swipes                         – vuokralainen poistaa oman swipensa
 *   GET    /v1/apartments/{id}/matches                        – vuokranantaja listaa asunnon matchit
 *   POST   /v1/apartments/{id}/tenants/{tenantId}/swipes      – vuokranantaja swaippaa vuokralaisen
 *   DELETE /v1/apartments/{id}/tenants/{tenantId}/swipes      – vuokranantaja poistaa oman swipensa
 *   GET    /v1/apartments/{id}/tenant-swipes                  – vuokranantaja listaa omat swipensa asunnolle
 */
@RestController
@RequestMapping("/v1/apartments/{apartmentId}")
@RequiredArgsConstructor
@Slf4j
public class ApartmentSwipeController {

    private final TenantSwipeService tenantSwipeService;
    private final LandlordSwipeService landlordSwipeService;
    private final MatchService matchService;

    @PostMapping("/swipes")
    public ResponseEntity<TenantSwipeResponse> swipeApartment(
            @PathVariable UUID apartmentId,
            @Valid @RequestBody SwipeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("Tenant swipe request for apartment {}, liked={}", apartmentId, request.getLiked());

        TenantSwipeResponse response = tenantSwipeService.swipe(
                apartmentId, request, principal == null ? null : principal.getUser());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/swipes")
    public ResponseEntity<Void> removeApartmentSwipe(
            @PathVariable UUID apartmentId,
            @AuthenticationPrincipal UserPrincipal principal) {

        tenantSwipeService.removeSwipe(apartmentId, principal == null ? null : principal.getUser());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/matches")
    public ResponseEntity<List<MatchResponse>> listApartmentMatches(
            @PathVariable UUID apartmentId,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(matchService.listForApartment(
                apartmentId, principal == null ? null : principal.getUser()));
    }

    @PostMapping("/tenants/{tenantId}/swipes")
    public ResponseEntity<LandlordSwipeResponse> swipeTenant(
            @PathVariable UUID apartmentId,
            @PathVariable UUID tenantId,
            @Valid @RequestBody SwipeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("Landlord swipe request for apartment {}, tenant {}, liked={}",
                apartmentId, tenantId, request.getLiked());

        LandlordSwipeResponse response = landlordSwipeService.swipe(
                apartmentId, tenantId, request, principal == null ? null : principal.getUser());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/tenants/{tenantId}/swipes")
    public ResponseEntity<Void> removeTenantSwipe(
            @PathVariable UUID apartmentId,
            @PathVariable UUID tenantId,
            @AuthenticationPrincipal UserPrincipal principal) {

        landlordSwipeService.removeSwipe(
                apartmentId, tenantId, principal == null ? null : principal.getUser());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tenant-swipes")
    public ResponseEntity<List<LandlordSwipeResponse>> listTenantSwipes(
            @PathVariable UUID apartmentId,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(landlordSwipeService.listForApartment(
                apartmentId, principal == null ? null : principal.getUser()));
    }
}
