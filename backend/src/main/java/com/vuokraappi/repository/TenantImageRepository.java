package com.vuokraappi.repository;

import com.vuokraappi.entity.TenantImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantImageRepository extends JpaRepository<TenantImage, UUID> {

    List<TenantImage> findByTenantIdOrderBySortOrderAsc(UUID tenantId);

    Optional<TenantImage> findByIdAndTenantId(UUID imageId, UUID tenantId);

    Optional<TenantImage> findByTenantIdAndIsPrimaryTrue(UUID tenantId);

    int countByTenantId(UUID tenantId);

    /** Nollaa kaikki primary-flagit vuokralaisen kuvilta ennen uuden asettamista */
    @Modifying
    @Query("UPDATE TenantImage i SET i.isPrimary = false WHERE i.tenant.id = :tenantId")
    void clearPrimaryForTenant(@Param("tenantId") UUID tenantId);

    /** Hakee seuraavan vapaan sort_order-arvon */
    @Query("SELECT COALESCE(MAX(i.sortOrder), -1) + 1 FROM TenantImage i WHERE i.tenant.id = :tenantId")
    int getNextSortOrder(@Param("tenantId") UUID tenantId);
}
