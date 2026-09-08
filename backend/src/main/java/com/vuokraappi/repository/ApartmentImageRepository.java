package com.vuokraappi.repository;

import com.vuokraappi.entity.ApartmentImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApartmentImageRepository extends JpaRepository<ApartmentImage, UUID> {

    List<ApartmentImage> findByApartmentIdOrderBySortOrderAsc(UUID apartmentId);

    Optional<ApartmentImage> findByIdAndApartmentId(UUID imageId, UUID apartmentId);

    int countByApartmentId(UUID apartmentId);

    /** Nollaa kaikki primary-flagit asunnon kuvilta ennen uuden asettamista */
    @Modifying
    @Query("UPDATE ApartmentImage i SET i.isPrimary = false WHERE i.apartment.id = :apartmentId")
    void clearPrimaryForApartment(@Param("apartmentId") UUID apartmentId);

    /** Hakee seuraavan vapaan sort_order-arvon */
    @Query("SELECT COALESCE(MAX(i.sortOrder), -1) + 1 FROM ApartmentImage i WHERE i.apartment.id = :apartmentId")
    int getNextSortOrder(@Param("apartmentId") UUID apartmentId);
}