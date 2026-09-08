package com.vuokraappi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Tallentaa salatun henkilötunnuksen.
 *
 * Tietoturvahuomio:
 *   - id = HMAC-SHA256(userId, IDENTITY_LOOKUP_SECRET) → ei suoraa FK:ta users-tauluun
 *   - encrypted_hetu = AES-256-GCM salattu henkilötunnus
 *   - Pelkällä kantapääsyllä käyttäjää ja hetua ei voi yhdistää
 */
@Entity
@Table(name = "identity_verifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IdentityVerification {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "encrypted_hetu", nullable = false)
    private String encryptedHetu;
}
