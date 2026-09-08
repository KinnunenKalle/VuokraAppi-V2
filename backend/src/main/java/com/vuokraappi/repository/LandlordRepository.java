package com.vuokraappi.repository;

import com.vuokraappi.entity.Landlord;
import com.vuokraappi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LandlordRepository extends JpaRepository<Landlord, UUID> {
    Optional<Landlord> findByUser(User user);
}