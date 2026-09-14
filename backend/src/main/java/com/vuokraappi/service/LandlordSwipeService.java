package com.vuokraappi.service;

import com.vuokraappi.dto.LandlordSwipeResponse;
import com.vuokraappi.dto.SwipeRequest;
import com.vuokraappi.entity.Apartment;
import com.vuokraappi.entity.Landlord;
import com.vuokraappi.entity.LandlordTenantSwipe;
import com.vuokraappi.entity.Match;
import com.vuokraappi.entity.Tenant;
import com.vuokraappi.entity.User;
import com.vuokraappi.exception.ResourceNotFoundException;
import com.vuokraappi.exception.UnauthorizedException;
import com.vuokraappi.repository.ApartmentRepository;
import com.vuokraappi.repository.LandlordTenantSwipeRepository;
import com.vuokraappi.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Vuokranantajan swipe-toiminnot vuokralaisista, aina sidottuna tiettyyn
 * vuokranantajan omistamaan asuntoon.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LandlordSwipeService {

    private final LandlordTenantSwipeRepository swipeRepository;
    private final TenantRepository tenantRepository;
    private final ApartmentRepository apartmentRepository;
    private final MatchService matchService;

    /**
     * Tallentaa vuokranantajan swipen vuokralaisesta tietyn asunnon suhteen.
     * Vaatii että pyytäjä omistaa kyseisen asunnon. Jos liked=true ja vuokralainen
     * on jo tykännyt tästä asunnosta, syntyy automaattisesti match.
     */
    @Transactional
    public LandlordSwipeResponse swipe(UUID apartmentId, UUID tenantId, SwipeRequest request, User currentUser) {
        Apartment apartment = getOwnedApartment(apartmentId, currentUser);
        Landlord landlord = apartment.getOwner();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Vuokralaista ei löydy id:llä: " + tenantId));

        LandlordTenantSwipe swipe = swipeRepository
                .findByLandlordIdAndTenantIdAndApartmentId(landlord.getId(), tenantId, apartmentId)
                .orElseGet(LandlordTenantSwipe::new);
        swipe.setLandlord(landlord);
        swipe.setTenant(tenant);
        swipe.setApartment(apartment);
        swipe.setLiked(request.getLiked());
        LandlordTenantSwipe saved = swipeRepository.save(swipe);

        log.info("Landlord {} swiped tenant {} for apartment {}: liked={}",
                landlord.getId(), tenantId, apartmentId, request.getLiked());

        Optional<Match> match = matchService.syncMatch(tenant, apartment, landlord);

        return LandlordSwipeResponse.builder()
                .id(saved.getId())
                .tenantId(tenantId)
                .apartmentId(apartmentId)
                .liked(saved.getLiked())
                .matched(match.isPresent())
                .matchId(match.map(Match::getId).orElse(null))
                .createdAt(saved.getCreatedAt())
                .build();
    }

    /** Poistaa vuokranantajan oman swipen vuokralaisesta tämän asunnon suhteen. */
    @Transactional
    public void removeSwipe(UUID apartmentId, UUID tenantId, User currentUser) {
        Apartment apartment = getOwnedApartment(apartmentId, currentUser);
        swipeRepository.deleteByLandlordIdAndTenantIdAndApartmentId(
                apartment.getOwner().getId(), tenantId, apartmentId);
        log.info("Landlord {} removed swipe on tenant {} for apartment {}",
                apartment.getOwner().getId(), tenantId, apartmentId);
    }

    /** Listaa kaikki vuokranantajan swipet tietylle asunnolle (jo käsitellyt vuokralaiset). */
    @Transactional(readOnly = true)
    public List<LandlordSwipeResponse> listForApartment(UUID apartmentId, User currentUser) {
        getOwnedApartment(apartmentId, currentUser);

        return swipeRepository.findByApartmentId(apartmentId).stream()
                .map(swipe -> LandlordSwipeResponse.builder()
                        .id(swipe.getId())
                        .tenantId(swipe.getTenant().getId())
                        .apartmentId(apartmentId)
                        .liked(swipe.getLiked())
                        .createdAt(swipe.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private Apartment getOwnedApartment(UUID apartmentId, User currentUser) {
        if (currentUser == null) {
            throw new UnauthorizedException("Kirjautuminen vaaditaan");
        }

        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Asuntoa ei löydy id:llä: " + apartmentId));

        if (!apartment.getOwner().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Voit yhdistää vuokralaisia vain omiin asuntoihisi");
        }

        return apartment;
    }
}
