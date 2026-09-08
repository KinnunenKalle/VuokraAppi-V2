package com.vuokraappi.repository;

import com.vuokraappi.entity.Apartment;
import com.vuokraappi.entity.Landlord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, UUID>, JpaSpecificationExecutor<Apartment> {
    List<Apartment> findByOwner(Landlord owner);
}