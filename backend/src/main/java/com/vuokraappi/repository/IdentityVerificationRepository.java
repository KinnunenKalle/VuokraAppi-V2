package com.vuokraappi.repository;

import com.vuokraappi.entity.IdentityVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface IdentityVerificationRepository extends JpaRepository<IdentityVerification, UUID> {
}
