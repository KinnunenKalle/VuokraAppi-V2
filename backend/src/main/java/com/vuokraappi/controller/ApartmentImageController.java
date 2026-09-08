package com.vuokraappi.controller;

import com.vuokraappi.config.UserPrincipal;
import com.vuokraappi.dto.ApartmentImageResponse;
import com.vuokraappi.dto.ApartmentImageUpdateRequest;
import com.vuokraappi.service.ApartmentImageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * REST API asuntojen kuville.
 *
 * Endpointit:
 *   POST   /v1/apartments/{id}/images               – Lataa kuva (vaatii omistajuuden)
 *   GET    /v1/apartments/{id}/images               – Listaa kuvat (julkinen)
 *   PATCH  /v1/apartments/{id}/images/{imageId}     – Päivitä metadata (vaatii omistajuuden)
 *   DELETE /v1/apartments/{id}/images/{imageId}     – Poista kuva (vaatii omistajuuden)
 */
@RestController
@RequestMapping("/v1/apartments/{apartmentId}/images")
@RequiredArgsConstructor
@Slf4j
public class ApartmentImageController {

    private final ApartmentImageService imageService;

    /**
     * Lataa uuden kuvan asunnolle.
     *
     * Pyyntö: multipart/form-data, kenttä "file"
     * Sallitut tyypit: image/jpeg, image/png, image/webp
     * Maksimikoko: määräytyy azure.storage.max-file-size-bytes-asetuksesta (oletus 10 MB)
     *
     * Huomaa: Spring Boot:n default multipart-raja on 1 MB.
     * Nosta se application.yml:ssä:
     *   spring.servlet.multipart.max-file-size=10MB
     *   spring.servlet.multipart.max-request-size=10MB
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApartmentImageResponse> uploadImage(
            @PathVariable UUID apartmentId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("Upload image request for apartment {}, file={}, size={}",
                apartmentId, file.getOriginalFilename(), file.getSize());

        ApartmentImageResponse response = imageService.uploadImage(
                apartmentId, file, principal.getUser());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Listaa asunnon kuvat järjestyksessä (sort_order ASC).
     * Julkinen endpoint – ei vaadi autentikointia.
     * Jokainen kuva sisältää lyhytikäisen SAS URL:n.
     */
    @GetMapping
    public ResponseEntity<List<ApartmentImageResponse>> listImages(
            @PathVariable UUID apartmentId) {

        log.debug("List images request for apartment {}", apartmentId);
        return ResponseEntity.ok(imageService.listImages(apartmentId));
    }

    /**
     * Päivittää kuvan metadataa.
     *
     * Käyttötapaukset:
     * - { "isPrimary": true }   → aseta pääkuvaksi
     * - { "sortOrder": 2 }      → vaihda järjestystä
     */
    @PatchMapping("/{imageId}")
    public ResponseEntity<ApartmentImageResponse> updateImage(
            @PathVariable UUID apartmentId,
            @PathVariable UUID imageId,
            @Valid @RequestBody ApartmentImageUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("Update image {} for apartment {}", imageId, apartmentId);

        ApartmentImageResponse response = imageService.updateImage(
                apartmentId, imageId, request, principal.getUser());

        return ResponseEntity.ok(response);
    }

    /**
     * Poistaa kuvan tietokannasta ja Azure Blob Storagesta.
     * Jos poistettu kuva oli pääkuva, seuraava kuva asetetaan automaattisesti uudeksi pääkuvaksi.
     */
    @DeleteMapping("/{imageId}")
    public ResponseEntity<Void> deleteImage(
            @PathVariable UUID apartmentId,
            @PathVariable UUID imageId,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("Delete image {} from apartment {}", imageId, apartmentId);

        imageService.deleteImage(apartmentId, imageId, principal.getUser());

        return ResponseEntity.noContent().build();
    }
}