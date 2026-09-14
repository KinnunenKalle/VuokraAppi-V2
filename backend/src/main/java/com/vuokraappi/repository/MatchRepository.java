package com.vuokraappi.repository;

import com.vuokraappi.entity.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MatchRepository extends JpaRepository<Match, UUID> {

    Optional<Match> findByTenantIdAndApartmentId(UUID tenantId, UUID apartmentId);

    List<Match> findByTenantId(UUID tenantId);

    List<Match> findByApartmentId(UUID apartmentId);
}
