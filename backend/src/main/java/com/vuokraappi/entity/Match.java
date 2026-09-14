package com.vuokraappi.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Molemminpuolinen match: sekä vuokralainen että vuokranantaja ovat tykänneet
 * samasta (tenant, apartment) -yhdistelmästä. Syntyy automaattisesti kun
 * jälkimmäinen puoli swaippaa "liked" toisen jo tykättyä.
 */
@Entity
@Table(name = "matches")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "landlord_id", nullable = false)
    private Landlord landlord;

    @CreationTimestamp
    @Column(name = "matched_at", nullable = false, updatable = false)
    private LocalDateTime matchedAt;
}
