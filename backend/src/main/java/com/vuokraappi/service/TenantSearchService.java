package com.vuokraappi.service;

import com.vuokraappi.dto.TenantResponse;
import com.vuokraappi.entity.Tenant;
import com.vuokraappi.entity.User;
import com.vuokraappi.repository.TenantRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TenantSearchService {

    private final TenantRepository tenantRepository;

    @Transactional(readOnly = true)
    public List<TenantResponse> searchTenants(
            Integer minIncome,
            Integer maxIncome,
            String occupation,
            Boolean hasPet,
            Integer minAge,
            Integer maxAge,
            String city,
            Boolean identityVerified) {

        log.info("Searching tenants with criteria: minIncome={}, maxIncome={}, occupation={}, hasPet={}, minAge={}, maxAge={}, city={}, identityVerified={}",
                minIncome, maxIncome, occupation, hasPet, minAge, maxAge, city, identityVerified);

        Specification<Tenant> spec = buildSpecification(minIncome, maxIncome, occupation, hasPet, minAge, maxAge, city, identityVerified);
        
        List<Tenant> tenants = tenantRepository.findAll(spec);
        
        log.info("Found {} tenants matching criteria", tenants.size());
        
        return tenants.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private Specification<Tenant> buildSpecification(
            Integer minIncome,
            Integer maxIncome,
            String occupation,
            Boolean hasPet,
            Integer minAge,
            Integer maxAge,
            String city,
            Boolean identityVerified) {

        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Join User-tauluun
            Join<Tenant, User> userJoin = root.join("user");

            // MinIncome
            if (minIncome != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                        root.get("monthlyIncome"), minIncome));
            }

            // MaxIncome
            if (maxIncome != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                        root.get("monthlyIncome"), maxIncome));
            }

            // Occupation (osittainen haku, case-insensitive)
            if (occupation != null && !occupation.isBlank()) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("occupation")),
                        "%" + occupation.toLowerCase() + "%"));
            }

            // HasPet
            if (hasPet != null) {
                if (hasPet) {
                    // On lemmikki - pet ei ole null eikä tyhjä
                    predicates.add(criteriaBuilder.and(
                            criteriaBuilder.isNotNull(root.get("pet")),
                            criteriaBuilder.notEqual(root.get("pet"), "")
                    ));
                } else {
                    // Ei ole lemmikkiä - pet on null tai tyhjä
                    predicates.add(criteriaBuilder.or(
                            criteriaBuilder.isNull(root.get("pet")),
                            criteriaBuilder.equal(root.get("pet"), "")
                    ));
                }
            }

            // Age range (lasketaan syntymäajasta)
            if (minAge != null || maxAge != null) {
                LocalDate today = LocalDate.now();
                
                if (minAge != null) {
                    LocalDate maxBirthDate = today.minusYears(minAge);
                    predicates.add(criteriaBuilder.lessThanOrEqualTo(
                            userJoin.get("dateOfBirth"), maxBirthDate));
                }
                
                if (maxAge != null) {
                    LocalDate minBirthDate = today.minusYears(maxAge + 1).plusDays(1);
                    predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                            userJoin.get("dateOfBirth"), minBirthDate));
                }
            }

            // City (osittainen haku, case-insensitive)
            if (city != null && !city.isBlank()) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("currentAddress")),
                        "%" + city.toLowerCase() + "%"));
            }

            // Vahva tunnistautuminen
            if (identityVerified != null) {
                predicates.add(criteriaBuilder.equal(userJoin.get("identityVerified"), identityVerified));
            }

            // Vain aktiiviset käyttäjät
            predicates.add(criteriaBuilder.isTrue(userJoin.get("isActive")));

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private TenantResponse mapToResponse(Tenant tenant) {
        TenantResponse response = new TenantResponse();
        
        User user = tenant.getUser();
        
        // User fields
        response.setId(user.getId());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setEmail(user.getEmail());
        response.setPhoneNumber(user.getPhoneNumber());
        response.setIntroduction(user.getIntroduction());
        response.setDateOfBirth(user.getDateOfBirth());
        
        // Calculate age
        if (user.getDateOfBirth() != null) {
            response.setAge(Period.between(user.getDateOfBirth(), LocalDate.now()).getYears());
        }
        
        // Tenant fields
        response.setOccupation(tenant.getOccupation());
        response.setMonthlyIncome(tenant.getMonthlyIncome());
        response.setCurrentAddress(tenant.getCurrentAddress());
        response.setPet(tenant.getPet());
        response.setIdentityVerified(user.getIdentityVerified());

        return response;
    }
}