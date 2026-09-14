package com.vuokraappi.repository;

import com.vuokraappi.entity.LandlordTenantSwipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LandlordTenantSwipeRepository extends JpaRepository<LandlordTenantSwipe, UUID> {

    Optional<LandlordTenantSwipe> findByLandlordIdAndTenantIdAndApartmentId(
            UUID landlordId, UUID tenantId, UUID apartmentId);

    List<LandlordTenantSwipe> findByApartmentId(UUID apartmentId);

    void deleteByLandlordIdAndTenantIdAndApartmentId(UUID landlordId, UUID tenantId, UUID apartmentId);
}
