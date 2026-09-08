package com.vuokraappi.service;

import com.vuokraappi.dto.UserDetailResponse;
import com.vuokraappi.dto.UserRegistrationRequest;
import com.vuokraappi.dto.UserResponse;
import com.vuokraappi.dto.UserUpdateRequest;
import com.vuokraappi.entity.Landlord;
import com.vuokraappi.entity.Tenant;
import com.vuokraappi.entity.User;
import com.vuokraappi.entity.UserRole;
import com.vuokraappi.exception.GraphApiException;
import com.vuokraappi.exception.UserAlreadyExistsException;
import com.vuokraappi.exception.UserNotFoundException;
import com.vuokraappi.repository.LandlordRepository;
import com.vuokraappi.repository.TenantRepository;
import com.vuokraappi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final LandlordRepository landlordRepository;
    private final GraphApiService graphApiService;
    
    @Transactional
    public UserResponse registerUser(UserRegistrationRequest request) {
        UUID userId = request.getId();
        String role = request.getRole().toUpperCase();
        
        log.info("Attempting to register user with ID: {} and role: {}", userId, role);
        
        // Tarkistetaan, onko käyttäjä jo olemassa tietokannassa
        if (userRepository.existsById(userId)) {
            log.warn("User with ID {} already exists in database", userId);
            throw new UserAlreadyExistsException(
                String.format("User with ID %s already exists", userId)
            );
        }
        
        // Varmistetaan, että käyttäjä on olemassa Microsoft Entra ID:ssä
        if (!graphApiService.userExistsInAzureAd(userId)) {
            log.error("User with ID {} does not exist in Microsoft Entra ID", userId);
            throw new GraphApiException(
                String.format("User with ID %s does not exist in Microsoft Entra ID", userId)
            );
        }
        
        try {
            // Päivitetään rooli Microsoft Entra ID:hen Graph API:n kautta (App Role)
            graphApiService.assignUserRole(userId, role);
            log.info("Successfully assigned app role in Microsoft Entra ID for user: {}", userId);
            
            // Luodaan käyttäjä tietokantaan
            User user = new User();
            user.setId(userId);
            user.setRole(UserRole.valueOf(role));
            user.setIsActive(true);
            
            // Luodaan roolin mukainen entiteetti ja asetetaan kaksisuuntainen suhde
            if (UserRole.TENANT.equals(user.getRole())) {
                Tenant tenant = new Tenant();
                tenant.setId(userId);  // Aseta ID!
                tenant.setUser(user);
                user.setTenant(tenant);
                log.info("Created tenant profile for user: {}", userId);
            } else if (UserRole.LANDLORD.equals(user.getRole())) {
                Landlord landlord = new Landlord();
                landlord.setId(userId);  // Aseta ID!
                landlord.setUser(user);
                user.setLandlord(landlord);
                log.info("Created landlord profile for user: {}", userId);
            }
            
            // Tallennetaan käyttäjä - cascade hoitaa tenant/landlord tallennuksen
            User savedUser = userRepository.save(user);
            
            log.info("Successfully registered user with ID: {} and role: {}", 
                     savedUser.getId(), savedUser.getRole());
            
            // Palautetaan vastaus
            return mapToResponse(savedUser);
            
        } catch (GraphApiException e) {
            log.error("Failed to update role in Microsoft Entra ID for user: {}", userId, e);
            // Graph API -virhe heitetään eteenpäin
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error during user registration for user: {}", userId, e);
            throw new RuntimeException("Failed to register user", e);
        }
    }
    
    @Transactional
    public void deleteUser(UUID userId) {
        log.info("Attempting to delete user with ID: {}", userId);
        
        // Tarkistetaan, että käyttäjä on olemassa tietokannassa
        User user = userRepository.findById(userId)
            .orElseThrow(() -> {
                log.warn("User with ID {} not found in database", userId);
                return new UserNotFoundException(
                    String.format("User with ID %s not found", userId)
                );
            });
        
        try {
            // Poistetaan käyttäjä Microsoft Entra ID:stä
            graphApiService.deleteUserFromEntraId(userId);
            log.info("Successfully deleted user {} from Microsoft Entra ID", userId);
            
            // Poistetaan käyttäjä tietokannasta
            // Cascade delete hoitaa tenant/landlord -taulujen poiston automaattisesti
            userRepository.delete(user);
            
            log.info("Successfully deleted user with ID: {} (cascade deleted tenant/landlord profile)", userId);
            
        } catch (GraphApiException e) {
            log.error("Failed to delete user from Microsoft Entra ID, aborting database deletion", e);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error during user deletion for user: {}", userId, e);
            throw new RuntimeException("Failed to delete user", e);
        }
    }
    
    private UserResponse mapToResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setRole(user.getRole());
        response.setCreatedAt(user.getCreatedAt());
        response.setIsActive(user.getIsActive());
        return response;
    }
    
    public UserDetailResponse getUser(UUID userId) {
        log.info("Fetching user with ID: {}", userId);
        
        User user = userRepository.findByIdWithDetails(userId)
            .orElseThrow(() -> {
                log.warn("User with ID {} not found", userId);
                return new UserNotFoundException(
                    String.format("User with ID %s not found", userId)
                );
            });
        
        return mapToDetailResponse(user);
    }
    
    @Transactional
    public UserDetailResponse updateUser(UUID userId, UserUpdateRequest request) {
        log.info("Updating user with ID: {}", userId);
        
        User user = userRepository.findByIdWithDetails(userId)
            .orElseThrow(() -> {
                log.warn("User with ID {} not found", userId);
                return new UserNotFoundException(
                    String.format("User with ID %s not found", userId)
                );
            });
        
        // Tallenna vanha email tarkistusta varten
        String oldEmail = user.getEmail();
        
        // Päivitä User-kentät jos ne on annettu
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        if (request.getIntroduction() != null) {
            user.setIntroduction(request.getIntroduction());
        }
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        // Päivitä Tenant-kentät jos käyttäjä on tenant
        if (user.getTenant() != null) {
            if (request.getOccupation() != null) {
                user.getTenant().setOccupation(request.getOccupation());
            }
            if (request.getMonthlyIncome() != null) {
                user.getTenant().setMonthlyIncome(request.getMonthlyIncome());
            }
            if (request.getCurrentAddress() != null) {
                user.getTenant().setCurrentAddress(request.getCurrentAddress());
            }
            if (request.getPet() != null) {
                user.getTenant().setPet(request.getPet());
            }
        }
        
        // Päivitä Landlord-kentät jos käyttäjä on landlord
        if (user.getLandlord() != null) {
            if (request.getCompanyName() != null) {
                user.getLandlord().setCompanyName(request.getCompanyName());
            }
            if (request.getBusinessId() != null) {
                user.getLandlord().setBusinessId(request.getBusinessId());
            }
            if (request.getBankAccount() != null) {
                user.getLandlord().setBankAccount(request.getBankAccount());
            }
        }
        
        // Tallenna muutokset
        User updatedUser = userRepository.save(user);
        
        // Jos email muuttui TAI email on asetettu ensimmäistä kertaa, päivitä identities Entra ID:hen
        // HUOM: Tarkista että email todella muuttui välttääksesi turhia API-kutsuja
        boolean emailChanged = request.getEmail() != null && !request.getEmail().equals(oldEmail);
        boolean isFirstTimeSettingEmail = oldEmail == null && request.getEmail() != null;
        
        if (emailChanged || isFirstTimeSettingEmail) {
            try {
                graphApiService.updateUserEmail(userId, request.getEmail());
                log.info("Successfully updated identities in Microsoft Entra ID for user: {}", userId);
            } catch (GraphApiException e) {
                // Jos Azure hylkää (esim. email on jo identiteetissä), logita mutta älä failaa
                // Email on jo tallennettu omaan tietokantaan, mikä on tärkein
                log.warn("Failed to update identities in Microsoft Entra ID for user: {} - {}", 
                        userId, e.getMessage());
                log.info("Email saved to database successfully, Azure identity update skipped");
            }
        }
        
        log.info("Successfully updated user with ID: {}", userId);
        return mapToDetailResponse(updatedUser);
    }
    
    private UserDetailResponse mapToDetailResponse(User user) {
        log.debug("Mapping user to detail response. User: {}, Tenant: {}, Landlord: {}", 
                  user.getId(), user.getTenant() != null, user.getLandlord() != null);
        
        UserDetailResponse response = new UserDetailResponse();
        
        // Perustiedot
        response.setId(user.getId());
        response.setRole(user.getRole());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setPhoneNumber(user.getPhoneNumber());
        response.setEmail(user.getEmail());
        response.setIntroduction(user.getIntroduction());
        response.setDateOfBirth(user.getDateOfBirth());
        response.setIdentityVerified(user.getIdentityVerified());
        response.setIdentityVerifiedAt(user.getIdentityVerifiedAt());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        response.setIsActive(user.getIsActive());
        
        log.debug("User basic fields - email: {}, intro: {}", user.getEmail(), user.getIntroduction());
        
        // Tenant-tiedot
        if (user.getTenant() != null) {
            log.debug("Loading tenant details");
            response.setOccupation(user.getTenant().getOccupation());
            response.setMonthlyIncome(user.getTenant().getMonthlyIncome());
            response.setCurrentAddress(user.getTenant().getCurrentAddress());
            response.setPet(user.getTenant().getPet());
        }
        
        // Landlord-tiedot
        if (user.getLandlord() != null) {
            log.debug("Loading landlord details");
            response.setCompanyName(user.getLandlord().getCompanyName());
            response.setBusinessId(user.getLandlord().getBusinessId());
            response.setBankAccount(user.getLandlord().getBankAccount());
        }
        
        return response;
    }
}