package com.vuokraappi.repository;

import com.vuokraappi.entity.TenantApartmentSwipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantApartmentSwipeRepository extends JpaRepository<TenantApartmentSwipe, UUID> {

    Optional<TenantApartmentSwipe> findByTenantIdAndApartmentId(UUID tenantId, UUID apartmentId);

    List<TenantApartmentSwipe> findByTenantId(UUID tenantId);

    void deleteByTenantIdAndApartmentId(UUID tenantId, UUID apartmentId);
}
