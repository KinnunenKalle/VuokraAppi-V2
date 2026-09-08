package com.vuokraappi.repository;

import com.vuokraappi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    boolean existsById(UUID id);
    
    @Query("SELECT u FROM User u " +
           "LEFT JOIN FETCH u.tenant " +
           "LEFT JOIN FETCH u.landlord " +
           "WHERE u.id = :id")
    Optional<User> findByIdWithDetails(@Param("id") UUID id);

    Optional<User> findByEmail(String email);
}
