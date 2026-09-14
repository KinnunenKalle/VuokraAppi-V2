package com.vuokraappi.controller;

import com.vuokraappi.config.UserPrincipal;
import com.vuokraappi.dto.MatchResponse;
import com.vuokraappi.dto.TenantSwipeResponse;
import com.vuokraappi.service.MatchService;
import com.vuokraappi.service.TenantSwipeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST API vuokralaisen omien swipejen ja matchien listaamiseen.
 *
 * Endpointit (vaativat kirjautumisen, vain vuokralainen itse):
 *   GET /v1/tenants/{id}/swipes   – kaikki oma swipet (asunnot joihin on jo otettu kantaa)
 *   GET /v1/tenants/{id}/matches  – kaikki omat matchit
 */
@RestController
@RequestMapping("/v1/tenants/{tenantId}")
@RequiredArgsConstructor
@Slf4j
public class TenantMatchController {

    private final TenantSwipeService tenantSwipeService;
    private final MatchService matchService;

    @GetMapping("/swipes")
    public ResponseEntity<List<TenantSwipeResponse>> listSwipes(
            @PathVariable UUID tenantId,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(tenantSwipeService.listMySwipes(
                tenantId, principal == null ? null : principal.getUser()));
    }

    @GetMapping("/matches")
    public ResponseEntity<List<MatchResponse>> listMatches(
            @PathVariable UUID tenantId,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(matchService.listForTenant(
                tenantId, principal == null ? null : principal.getUser()));
    }
}
