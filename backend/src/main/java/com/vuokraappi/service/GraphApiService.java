package com.vuokraappi.service;

import com.vuokraappi.config.MicrosoftGraphProperties;
import com.vuokraappi.exception.GraphApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GraphApiService {
    
    private final WebClient graphApiWebClient;
    private final MicrosoftGraphProperties graphProperties;
    
    @Value("${azure.application.app-client-id:00000000-0000-0000-0000-000000000000}")
    private String appClientId;
    
    /**
     * Asettaa käyttäjälle App Rolen Microsoft Entra ID:ssä
     */
    public void assignUserRole(UUID userId, String roleName) {
        log.info("Assigning role {} to user {} in Microsoft Entra ID", roleName, userId);
        
        try {
            String servicePrincipalId = getServicePrincipalId();
            String roleId = getAppRoleId(servicePrincipalId, roleName);
            removeExistingAppRoleAssignments(userId, servicePrincipalId);
            
            Map<String, Object> body = new HashMap<>();
            body.put("principalId", userId.toString());
            body.put("resourceId", servicePrincipalId);
            body.put("appRoleId", roleId);
            
            graphApiWebClient
                .post()
                .uri("/users/{userId}/appRoleAssignments", userId.toString())
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .block();
            
            log.info("Successfully assigned role {} to user {} in Microsoft Entra ID", roleName, userId);
            
        } catch (WebClientResponseException e) {
            log.error("Failed to assign app role in Microsoft Entra ID: {} - {}", 
                     e.getStatusCode(), e.getResponseBodyAsString());
            throw new GraphApiException(
                String.format("Failed to assign role %s to user %s in Entra ID: %s", 
                    roleName, userId, e.getMessage()), e);
        } catch (Exception e) {
            log.error("Unexpected error while assigning app role in Microsoft Entra ID", e);
            throw new GraphApiException(
                String.format("Unexpected error while assigning role %s to user %s in Entra ID", 
                    roleName, userId), e);
        }
    }
    
    private String getServicePrincipalId() {
        log.debug("Fetching service principal ID for MAIN app client ID: {}", appClientId);
        
        try {
            Map<String, Object> response = graphApiWebClient
                .get()
                .uri(uriBuilder -> uriBuilder
                    .path("/servicePrincipals")
                    .queryParam("$filter", "appId eq '" + appClientId + "'")
                    .build())
                .retrieve()
                .bodyToMono(Map.class)
                .block();
            
            if (response != null && response.containsKey("value")) {
                List<?> servicePrincipals = (List<?>) response.get("value");
                if (!servicePrincipals.isEmpty()) {
                    Map<String, Object> sp = (Map<String, Object>) servicePrincipals.get(0);
                    String spId = (String) sp.get("id");
                    log.debug("Found service principal ID: {}", spId);
                    return spId;
                }
            }
            
            throw new GraphApiException("Service principal not found for MAIN app client ID: " + appClientId);
            
        } catch (WebClientResponseException e) {
            log.error("Failed to fetch service principal: {} - {}", 
                     e.getStatusCode(), e.getResponseBodyAsString());
            throw new GraphApiException("Failed to fetch service principal", e);
        }
    }
    
    private String getAppRoleId(String servicePrincipalId, String roleName) {
        log.debug("Fetching app role ID for role: {}", roleName);
        
        try {
            Map<String, Object> response = graphApiWebClient
                .get()
                .uri("/servicePrincipals/{id}", servicePrincipalId)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
            
            if (response != null && response.containsKey("appRoles")) {
                List<?> appRoles = (List<?>) response.get("appRoles");
                for (Object roleObj : appRoles) {
                    Map<String, Object> role = (Map<String, Object>) roleObj;
                    String value = (String) role.get("value");
                    if (roleName.equalsIgnoreCase(value)) {
                        String roleId = (String) role.get("id");
                        log.debug("Found app role ID {} for role {}", roleId, roleName);
                        return roleId;
                    }
                }
            }
            
            throw new GraphApiException("App role not found: " + roleName);
            
        } catch (WebClientResponseException e) {
            log.error("Failed to fetch app roles: {} - {}", 
                     e.getStatusCode(), e.getResponseBodyAsString());
            throw new GraphApiException("Failed to fetch app roles", e);
        }
    }
    
    private void removeExistingAppRoleAssignments(UUID userId, String servicePrincipalId) {
        log.debug("Removing existing app role assignments for user: {}", userId);
        
        try {
            Map<String, Object> response = graphApiWebClient
                .get()
                .uri(uriBuilder -> uriBuilder
                    .path("/users/{userId}/appRoleAssignments")
                    .queryParam("$filter", "resourceId eq " + servicePrincipalId)
                    .build(userId.toString()))
                .retrieve()
                .bodyToMono(Map.class)
                .block();
            
            if (response != null && response.containsKey("value")) {
                List<?> assignments = (List<?>) response.get("value");
                for (Object assignmentObj : assignments) {
                    Map<String, Object> assignment = (Map<String, Object>) assignmentObj;
                    String assignmentId = (String) assignment.get("id");
                    
                    graphApiWebClient
                        .delete()
                        .uri("/users/{userId}/appRoleAssignments/{assignmentId}", 
                             userId.toString(), assignmentId)
                        .retrieve()
                        .toBodilessEntity()
                        .block();
                    
                    log.debug("Removed app role assignment: {}", assignmentId);
                }
            }
            
        } catch (WebClientResponseException.NotFound e) {
            log.debug("No existing app role assignments found");
        } catch (WebClientResponseException e) {
            log.warn("Failed to remove existing app role assignments: {} - {}", 
                    e.getStatusCode(), e.getResponseBodyAsString());
        }
    }
    
    public boolean userExistsInAzureAd(UUID userId) {
        log.info("Checking if user {} exists in Microsoft Entra ID", userId);
        
        try {
            Map<String, Object> user = graphApiWebClient
                .get()
                .uri("/users/{userId}", userId.toString())
                .retrieve()
                .bodyToMono(Map.class)
                .block();
            
            boolean exists = user != null;
            log.info("User {} {} in Microsoft Entra ID", userId, exists ? "exists" : "does not exist");
            return exists;
            
        } catch (WebClientResponseException.NotFound e) {
            log.warn("User {} not found in Microsoft Entra ID", userId);
            return false;
        } catch (Exception e) {
            log.error("Error checking if user exists in Microsoft Entra ID", e);
            throw new GraphApiException(
                String.format("Error checking if user %s exists in Entra ID", userId), e);
        }
    }
    
    public void deleteUserFromEntraId(UUID userId) {
        log.info("Deleting user {} from Microsoft Entra ID", userId);
        
        try {
            graphApiWebClient
                .delete()
                .uri("/users/{userId}", userId.toString())
                .retrieve()
                .toBodilessEntity()
                .block();
            
            log.info("Successfully deleted user {} from Microsoft Entra ID", userId);
            
        } catch (WebClientResponseException.NotFound e) {
            log.warn("User {} not found in Microsoft Entra ID (may have been already deleted)", userId);
        } catch (WebClientResponseException e) {
            log.error("Failed to delete user from Microsoft Entra ID: {} - {}", 
                     e.getStatusCode(), e.getResponseBodyAsString());
            throw new GraphApiException(
                String.format("Failed to delete user %s from Entra ID: %s", 
                    userId, e.getMessage()), e);
        } catch (Exception e) {
            log.error("Unexpected error while deleting user from Microsoft Entra ID", e);
            throw new GraphApiException(
                String.format("Unexpected error while deleting user %s from Entra ID", userId), e);
        }
    }
    
    /**
     * Päivittää käyttäjän identities-kentän Microsoft Entra ID:ssä
     * 
     * Turvallinen päivitysprosessi:
     * 1. Lisää uusi email identity (käyttäjällä on nyt vanha + uusi)
     * 2. Poista vanha email identity (jää vain uusi)
     * 
     * Jos vaihe 2 epäonnistuu, käyttäjä voi silti kirjautua molemmilla osoitteilla.
     * 
     * HUOM: Päivittää vain identities-kentän Azuressa, ei mail-kenttää.
     * Email tallennetaan vain sovelluksen omaan tietokantaan.
     */
    public void updateUserEmail(UUID userId, String email) {
        log.info("Updating identities for user {} in Microsoft Entra ID", userId);
        
        try {
            // 1. Haetaan käyttäjän nykyiset identityt
            Map<String, Object> currentUser = graphApiWebClient
                .get()
                .uri("/users/{userId}?$select=identities,mail", userId.toString())
                .retrieve()
                .bodyToMono(Map.class)
                .block();
            
            List<Map<String, Object>> existingIdentities = 
                (List<Map<String, Object>>) currentUser.get("identities");
            String currentEmail = (String) currentUser.get("mail");
            
            log.debug("Current email: {}, Existing identities: {}", currentEmail, existingIdentities);
            
            // 2. Tarkista onko uusi email jo identiteetissä
            boolean emailAlreadyExists = false;
            if (existingIdentities != null) {
                for (Map<String, Object> identity : existingIdentities) {
                    String signInType = (String) identity.get("signInType");
                    String issuerAssignedId = (String) identity.get("issuerAssignedId");
                    if ("emailAddress".equals(signInType) && email.equals(issuerAssignedId)) {
                        emailAlreadyExists = true;
                        log.info("Email {} already exists in identities, skipping Azure update", email);
                        break;
                    }
                }
            }
            
            // Jos email on jo olemassa, ei tarvitse tehdä mitään Azureen
            if (emailAlreadyExists) {
                log.info("Identity update skipped - email already exists in Azure");
                return;
            }
            
            // 3. Säilytä kaikki nykyiset identityt ja lisää uusi email
            List<Map<String, Object>> updatedIdentities = new ArrayList<>();
            if (existingIdentities != null) {
                updatedIdentities.addAll(existingIdentities);
            }
            
            // Lisää uusi email identity
            Map<String, Object> newEmailIdentity = new HashMap<>();
            newEmailIdentity.put("signInType", "emailAddress");
            newEmailIdentity.put("issuer", getTenantDomain());
            newEmailIdentity.put("issuerAssignedId", email);
            updatedIdentities.add(newEmailIdentity);
            
            // 3. Lisää uusi email identity (ILMAN mail-kenttää)
            Map<String, Object> bodyWithNewIdentity = new HashMap<>();
            bodyWithNewIdentity.put("identities", updatedIdentities);
            
            log.debug("Adding new identity. Body: {}", bodyWithNewIdentity);
            
            graphApiWebClient
                .patch()
                .uri("/users/{userId}", userId.toString())
                .bodyValue(bodyWithNewIdentity)
                .retrieve()
                .toBodilessEntity()
                .block();
            
            log.info("Successfully added new email identity for user {}", userId);
            
            // 4. Haetaan päivitetyt identityt
            Map<String, Object> updatedUser = graphApiWebClient
                .get()
                .uri("/users/{userId}?$select=identities", userId.toString())
                .retrieve()
                .bodyToMono(Map.class)
                .block();
            
            List<Map<String, Object>> currentIdentities = 
                (List<Map<String, Object>>) updatedUser.get("identities");
            
            log.debug("Current identities after adding new: {}", currentIdentities);
            
            // 5. Poista vanhat emailAddress-tyyppiset identityt (paitsi juuri lisätty uusi)
            List<Map<String, Object>> finalIdentities = new ArrayList<>();
            if (currentIdentities != null) {
                for (Map<String, Object> identity : currentIdentities) {
                    String signInType = (String) identity.get("signInType");
                    String issuerAssignedId = (String) identity.get("issuerAssignedId");
                    
                    // Säilytä jos:
                    // - Ei ole emailAddress-tyyppi TAI
                    // - On emailAddress JA on uusi email
                    if (!"emailAddress".equals(signInType) || email.equals(issuerAssignedId)) {
                        finalIdentities.add(identity);
                    }
                }
            }
            
            // Päivitä vain identityt (poista vanhat emailit)
            Map<String, Object> bodyRemoveOld = new HashMap<>();
            bodyRemoveOld.put("identities", finalIdentities);
            
            log.debug("Removing old email identities. Body: {}", bodyRemoveOld);
            
            graphApiWebClient
                .patch()
                .uri("/users/{userId}", userId.toString())
                .bodyValue(bodyRemoveOld)
                .retrieve()
                .toBodilessEntity()
                .block();
            
            log.info("Successfully removed old email identities for user {}", userId);
            
            // 6. Vahvistetaan että päivitys onnistui
            Map<String, Object> finalUser = graphApiWebClient
                .get()
                .uri("/users/{userId}?$select=identities,mail", userId.toString())
                .retrieve()
                .bodyToMono(Map.class)
                .block();
            
            log.info("Final state - identities: {}", 
                    finalUser.get("identities"));
            
            log.info("Identities update completed successfully for user {}", userId);
            
        } catch (WebClientResponseException e) {
            log.error("Failed to update identities in Microsoft Entra ID: {} - {}", 
                     e.getStatusCode(), e.getResponseBodyAsString());
            throw new GraphApiException(
                String.format("Failed to update identities for user %s in Entra ID: %s", 
                    userId, e.getMessage()), e);
        } catch (Exception e) {
            log.error("Unexpected error while updating identities in Microsoft Entra ID", e);
            throw new GraphApiException(
                String.format("Unexpected error while updating identities for user %s in Entra ID", userId), e);
        }
    }
    
    /**
     * Hakee tenant domainin (esim. "vuokraappi.onmicrosoft.com")
     */
    private String getTenantDomain() {
        return "vuokraappi.onmicrosoft.com";
    }
}