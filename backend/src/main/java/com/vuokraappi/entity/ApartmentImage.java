package com.vuokraappi.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "apartment_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApartmentImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    /**
     * Polku Azure Blob Storagessa, esim. "apartment-images/{apartmentId}/{imageId}.jpg"
     * Tallennetaan ilman container-nimeä, jotta container voidaan vaihtaa tarvittaessa.
     */
    @Column(name = "blob_name", nullable = false, length = 500)
    private String blobName;

    /** Alkuperäinen tiedostonimi käyttäjältä – tallennetaan vain näyttämistä varten */
    @Column(name = "filename", length = 255)
    private String filename;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    /**
     * Näyttöjärjestys – 0 on ensimmäinen.
     * Asiakassovellus voi pyytää järjestyksen muutosta PATCH-kutsulla.
     */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    /**
     * Onko tämä asunnon pääkuva (esim. listauksessa näytettävä).
     * Vain yksi kuva per asunto voi olla primary – tämä varmistetaan servicessä.
     */
    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary = false;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;
}