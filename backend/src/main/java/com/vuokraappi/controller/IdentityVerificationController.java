package com.vuokraappi.controller;

import com.vuokraappi.config.SignicatProperties;
import com.vuokraappi.service.SignicatAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/identity")
@RequiredArgsConstructor
@Slf4j
public class IdentityVerificationController {

    private final SignicatAuthService signicatAuthService;
    private final SignicatProperties signicatProperties;

    /**
     * Käynnistää vahvan tunnistautumisen.
     * Palauttaa URL:n johon frontend ohjaa käyttäjän.
     *
     * POST /v1/identity/verify/start
     * Body: { "userId": "uuid" }
     */
    @PostMapping("/verify/start")
    public ResponseEntity<Map<String, String>> startVerification(@RequestBody Map<String, String> body) {
        UUID userId = UUID.fromString(body.get("userId"));
        log.info("Starting identity verification for user {}", userId);

        String redirectUrl = signicatAuthService.startVerification(userId);
        return ResponseEntity.ok(Map.of("redirectUrl", redirectUrl));
    }

    /**
     * Signicatin callback tunnistautumisen jälkeen.
     * Ohjaa käyttäjän frontendiin onnistumis- tai virhesivulle.
     *
     * GET /v1/identity/verify/callback?code=...&state=...
     */
    @GetMapping("/verify/callback")
    public ResponseEntity<Void> handleCallback(
            @RequestParam String code,
            @RequestParam String state) {

        log.info("Received Signicat callback, state={}", state);

        try {
            signicatAuthService.handleCallback(code, state);
            log.info("Identity verification completed successfully");
            return ResponseEntity.status(302)
                .location(URI.create(signicatProperties.getFrontendRedirectUrl() + "?success=true"))
                .build();
        } catch (Exception e) {
            log.error("Identity verification failed: {}", e.getMessage(), e);
            return ResponseEntity.status(302)
                .location(URI.create(signicatProperties.getFrontendRedirectUrl() + "?success=false"))
                .build();
        }
    }
}
