package com.vuokraappi.repository;

import com.vuokraappi.dto.ApartmentSearchCriteria;
import com.vuokraappi.entity.Apartment;
import com.vuokraappi.entity.Landlord;
import com.vuokraappi.entity.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specification builder asuntojen hakua varten.
 * Rakentaa dynaamisesti SQL-kyselyt annettujen hakukriteerien perusteella.
 */
public class ApartmentSpecification {

    /**
     * Rakentaa Specification hakukriteereistä.
     * Vain ei-null kriteerit lisätään hakuun.
     */
    public static Specification<Apartment> withCriteria(ApartmentSearchCriteria criteria) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Exact matches
            if (criteria.getZipcode() != null && !criteria.getZipcode().isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("zipcode"), criteria.getZipcode()));
            }

            if (criteria.getCity() != null && !criteria.getCity().isEmpty()) {
                predicates.add(criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("city")),
                    "%" + criteria.getCity().toLowerCase() + "%"
                ));
            }

            if (criteria.getRegion() != null && !criteria.getRegion().isEmpty()) {
                predicates.add(criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("region")),
                    "%" + criteria.getRegion().toLowerCase() + "%"
                ));
            }

            // Size range
            if (criteria.getMinSize() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                    root.get("size"), criteria.getMinSize()
                ));
            }

            if (criteria.getMaxSize() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                    root.get("size"), criteria.getMaxSize()
                ));
            }

            // Rent range
            if (criteria.getMinRent() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                    root.get("rent"), criteria.getMinRent()
                ));
            }

            if (criteria.getMaxRent() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                    root.get("rent"), criteria.getMaxRent()
                ));
            }

            // Location-based search (Haversine formula for distance calculation)
            if (criteria.getLatitude() != null && 
                criteria.getLongitude() != null && 
                criteria.getRadiusKm() != null) {
                
                // Haversine formula approximation:
                // distance = ACOS(SIN(lat1) * SIN(lat2) + COS(lat1) * COS(lat2) * COS(lon2 - lon1)) * 6371
                // where 6371 is Earth's radius in km
                
                double lat = Math.toRadians(criteria.getLatitude());
                double lon = Math.toRadians(criteria.getLongitude());
                double radius = criteria.getRadiusKm();
                
                // Yksinkertaistettu laatikkorajaus ensin (nopeampi)
                // ~111 km per degree latitude, ~111 * cos(lat) km per degree longitude
                double latDelta = radius / 111.0;
                double lonDelta = radius / (111.0 * Math.cos(lat));
                
                predicates.add(criteriaBuilder.between(
                    root.get("latitude"),
                    criteria.getLatitude() - latDelta,
                    criteria.getLatitude() + latDelta
                ));
                
                predicates.add(criteriaBuilder.between(
                    root.get("longitude"),
                    criteria.getLongitude() - lonDelta,
                    criteria.getLongitude() + lonDelta
                ));
                
                // Tarkempi etäisyystarkistus voitaisiin tehdä sovellustasolla
                // tai native SQL-kyselyllä jos tarvitaan täydellistä tarkkuutta
            }

            // Suodata vahvistetun identiteetin omaavien vuokranantajien asunnot
            if (criteria.getLandlordIdentityVerified() != null) {
                Join<Apartment, Landlord> landlordJoin = root.join("owner");
                Join<Landlord, User> userJoin = landlordJoin.join("user");
                predicates.add(criteriaBuilder.equal(
                    userJoin.get("identityVerified"), criteria.getLandlordIdentityVerified()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}