package com.vuokraappi.service;

import com.vuokraappi.dto.SwipeRequest;
import com.vuokraappi.dto.TenantSwipeResponse;
import com.vuokraappi.entity.Apartment;
import com.vuokraappi.entity.Match;
import com.vuokraappi.entity.Tenant;
import com.vuokraappi.entity.TenantApartmentSwipe;
import com.vuokraappi.entity.User;
import com.vuokraappi.exception.ResourceNotFoundException;
import com.vuokraappi.exception.UnauthorizedException;
import com.vuokraappi.repository.ApartmentRepository;
import com.vuokraappi.repository.TenantApartmentSwipeRepository;
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
 * Vuokralaisen swipe-toiminnot asunnoista (Tinder-tyyppinen selaus).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TenantSwipeService {

    private final TenantApartmentSwipeRepository swipeRepository;
    private final TenantRepository tenantRepository;
    private final ApartmentRepository apartmentRepository;
    private final MatchService matchService;

    /**
     * Tallentaa vuokralaisen swipen asunnosta. Uudelleen-swaippaus päivittää
     * aiemman valinnan. Jos liked=true ja asunnon omistaja on jo tykännyt
     * tästä vuokralaisesta tämän asunnon suhteen, syntyy automaattisesti match.
     */
    @Transactional
    public TenantSwipeResponse swipe(UUID apartmentId, SwipeRequest request, User currentUser) {
        Tenant tenant = getTenant(currentUser);
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Asuntoa ei löydy id:llä: " + apartmentId));

        TenantApartmentSwipe swipe = swipeRepository.findByTenantIdAndApartmentId(tenant.getId(), apartmentId)
                .orElseGet(TenantApartmentSwipe::new);
        swipe.setTenant(tenant);
        swipe.setApartment(apartment);
        swipe.setLiked(request.getLiked());
        TenantApartmentSwipe saved = swipeRepository.save(swipe);

        log.info("Tenant {} swiped apartment {}: liked={}", tenant.getId(), apartmentId, request.getLiked());

        Optional<Match> match = matchService.syncMatch(tenant, apartment, apartment.getOwner());

        return TenantSwipeResponse.builder()
                .id(saved.getId())
                .apartmentId(apartmentId)
                .liked(saved.getLiked())
                .matched(match.isPresent())
                .matchId(match.map(Match::getId).orElse(null))
                .createdAt(saved.getCreatedAt())
                .build();
    }

    /** Poistaa vuokralaisen oman swipen asunnosta. Ei vaikuta jo syntyneeseen matchiin. */
    @Transactional
    public void removeSwipe(UUID apartmentId, User currentUser) {
        Tenant tenant = getTenant(currentUser);
        swipeRepository.deleteByTenantIdAndApartmentId(tenant.getId(), apartmentId);
        log.info("Tenant {} removed swipe on apartment {}", tenant.getId(), apartmentId);
    }

    /** Listaa vuokralaisen kaikki swipet (jotta selauslistalta voi suodattaa jo käsitellyt). */
    @Transactional(readOnly = true)
    public List<TenantSwipeResponse> listMySwipes(UUID tenantId, User currentUser) {
        requireAuthenticated(currentUser);
        if (!tenantId.equals(currentUser.getId())) {
            throw new UnauthorizedException("Voit listata vain omat swaippauksesi");
        }

        return swipeRepository.findByTenantId(tenantId).stream()
                .map(swipe -> TenantSwipeResponse.builder()
                        .id(swipe.getId())
                        .apartmentId(swipe.getApartment().getId())
                        .liked(swipe.getLiked())
                        .createdAt(swipe.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private Tenant getTenant(User currentUser) {
        requireAuthenticated(currentUser);
        return tenantRepository.findById(currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("Vain vuokralaiset voivat swaipata asuntoja"));
    }

    private void requireAuthenticated(User currentUser) {
        if (currentUser == null) {
            throw new UnauthorizedException("Kirjautuminen vaaditaan");
        }
    }
}
