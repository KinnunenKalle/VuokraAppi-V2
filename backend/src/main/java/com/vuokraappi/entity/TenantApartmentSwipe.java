package com.vuokraappi.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vuokralaisen swipe (tykkäys/pass) yksittäisestä asunnosta.
 * Yksi rivi per (tenant, apartment) – uudelleen-swaippaus päivittää olemassa olevan rivin.
 */
@Entity
@Table(name = "tenant_apartment_swipes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TenantApartmentSwipe {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    /** true = kiinnostaa (like), false = ei kiinnosta (pass) */
    @Column(name = "liked", nullable = false)
    private Boolean liked;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
