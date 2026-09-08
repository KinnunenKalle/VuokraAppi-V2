package com.vuokraappi.config;

import com.vuokraappi.entity.User;
import com.vuokraappi.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Base64;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
@Profile({"dev", "prod"})
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // Puretaan JWT token - API Gateway on jo validoinut sen
            String token = authHeader.substring(7);
            String payload = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]));
            JsonNode claims = objectMapper.readTree(payload);

            // Haetaan oid-kenttä (Azure AD user ID)
            String oid = claims.get("oid").asText();
            UUID userId = UUID.fromString(oid);

            // Haetaan käyttäjä tietokannasta
            User user = userRepository.findById(userId).orElse(null);

            if (user != null) {
                UserPrincipal principal = new UserPrincipal(user);
                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("Authenticated user {} from JWT token", userId);
            } else {
                log.warn("User {} from JWT token not found in database", userId);
            }

        } catch (Exception e) {
            log.error("Failed to parse JWT token", e);
        }

        filterChain.doFilter(request, response);
    }
}