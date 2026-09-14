package com.vuokraappi.controller;

import com.vuokraappi.config.UserPrincipal;
import com.vuokraappi.service.MatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST API matchin purkamiseen (unmatch). Kumpi tahansa matchin osapuoli –
 * vuokralainen tai asunnon omistava vuokranantaja – voi purkaa matchin.
 *
 *   DELETE /v1/matches/{id} – purkaa matchin
 */
@RestController
@RequestMapping("/v1/matches")
@RequiredArgsConstructor
@Slf4j
public class MatchController {

    private final MatchService matchService;

    @DeleteMapping("/{matchId}")
    public ResponseEntity<Void> unmatch(
            @PathVariable UUID matchId,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("Unmatch request for match {}", matchId);
        matchService.unmatch(matchId, principal == null ? null : principal.getUser());
        return ResponseEntity.noContent().build();
    }
}
