package com.vuokraappi.service;

import com.vuokraappi.dto.MatchResponse;
import com.vuokraappi.entity.*;
import com.vuokraappi.exception.ResourceNotFoundException;
import com.vuokraappi.exception.UnauthorizedException;
import com.vuokraappi.repository.ApartmentRepository;
import com.vuokraappi.repository.LandlordTenantSwipeRepository;
import com.vuokraappi.repository.MatchRepository;
import com.vuokraappi.repository.TenantApartmentSwipeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Vastaa matchien luonnista ja hallinnasta. Match syntyy kun sekä vuokralainen
 * että asunnon omistava vuokranantaja ovat molemmat tykänneet (liked=true)
 * samasta (tenant, apartment) -yhdistelmästä.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MatchService {

    private final MatchRepository matchRepository;
    private final TenantApartmentSwipeRepository tenantSwipeRepository;
    private final LandlordTenantSwipeRepository landlordSwipeRepository;
    private final ApartmentRepository apartmentRepository;

    /**
     * Kutsutaan aina kun jompikumpi osapuoli swaippaa (liked tai pass).
     * Luo matchin jos molemmat ovat tykänneet eikä matchia vielä ole.
     * Ei koskaan poista olemassa olevaa matchia – purku tehdään vain
     * eksplisiittisesti {@link #unmatch}-metodilla.
     *
     * @return nykyinen match (olemassa ollut tai juuri luotu), tai tyhjä jos ei molemminpuolista tykkäystä
     */
    @Transactional
    Optional<Match> syncMatch(Tenant tenant, Apartment apartment, Landlord landlord) {
        Optional<Match> existing = matchRepository.findByTenantIdAndApartmentId(tenant.getId(), apartment.getId());
        if (existing.isPresent()) {
            return existing;
        }

        boolean tenantLiked = tenantSwipeRepository
                .findByTenantIdAndApartmentId(tenant.getId(), apartment.getId())
                .map(TenantApartmentSwipe::getLiked)
                .orElse(false);
        boolean landlordLiked = landlordSwipeRepository
                .findByLandlordIdAndTenantIdAndApartmentId(landlord.getId(), tenant.getId(), apartment.getId())
                .map(LandlordTenantSwipe::getLiked)
                .orElse(false);

        if (!tenantLiked || !landlordLiked) {
            return Optional.empty();
        }

        Match match = new Match();
        match.setTenant(tenant);
        match.setApartment(apartment);
        match.setLandlord(landlord);
        Match saved = matchRepository.save(match);
        log.info("Match created: tenant={}, apartment={}, landlord={}",
                tenant.getId(), apartment.getId(), landlord.getId());
        return Optional.of(saved);
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> listForTenant(UUID tenantId, User currentUser) {
        requireAuthenticated(currentUser);
        if (!tenantId.equals(currentUser.getId())) {
            throw new UnauthorizedException("Voit listata vain omat matchisi");
        }
        return matchRepository.findByTenantId(tenantId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> listForApartment(UUID apartmentId, User currentUser) {
        requireAuthenticated(currentUser);
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Asuntoa ei löydy id:llä: " + apartmentId));

        if (!apartment.getOwner().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Voit listata vain omien asuntojesi matchit");
        }

        return matchRepository.findByApartmentId(apartmentId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void unmatch(UUID matchId, User currentUser) {
        requireAuthenticated(currentUser);
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Matchia ei löydy id:llä: " + matchId));

        boolean isTenant = match.getTenant().getId().equals(currentUser.getId());
        boolean isLandlord = match.getLandlord().getId().equals(currentUser.getId());
        if (!isTenant && !isLandlord) {
            throw new UnauthorizedException("Voit purkaa vain omia matchejasi");
        }

        matchRepository.delete(match);
        log.info("Match {} unmatched by user {}", matchId, currentUser.getId());
    }

    private void requireAuthenticated(User currentUser) {
        if (currentUser == null) {
            throw new UnauthorizedException("Kirjautuminen vaaditaan");
        }
    }

    private MatchResponse toResponse(Match match) {
        User tenantUser = match.getTenant().getUser();
        String firstName = tenantUser.getFirstName() != null ? tenantUser.getFirstName() : "";
        String lastName = tenantUser.getLastName() != null ? tenantUser.getLastName() : "";

        Apartment apartment = match.getApartment();
        String address = apartment.getStreetAddress() + ", " + apartment.getCity();

        return MatchResponse.builder()
                .id(match.getId())
                .tenantId(match.getTenant().getId())
                .tenantName((firstName + " " + lastName).trim())
                .apartmentId(apartment.getId())
                .apartmentAddress(address)
                .landlordId(match.getLandlord().getId())
                .matchedAt(match.getMatchedAt())
                .build();
    }
}
