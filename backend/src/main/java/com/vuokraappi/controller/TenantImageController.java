package com.vuokraappi.controller;

import com.vuokraappi.config.UserPrincipal;
import com.vuokraappi.dto.TenantImageResponse;
import com.vuokraappi.dto.TenantImageUpdateRequest;
import com.vuokraappi.service.TenantImageService;
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
 * REST API vuokralaisen kuville.
 *
 * Endpointit (kaikki vaativat kirjautumisen):
 *   POST   /v1/tenants/{id}/images               – Lataa kuva (vaatii omistajuuden, max 5 kuvaa)
 *   GET    /v1/tenants/{id}/images                – Listaa kuvat
 *   PATCH  /v1/tenants/{id}/images/{imageId}      – Päivitä metadata, esim. profiilikuva/järjestys (vaatii omistajuuden)
 *   DELETE /v1/tenants/{id}/images/{imageId}      – Poista kuva (vaatii omistajuuden)
 */
@RestController
@RequestMapping("/v1/tenants/{tenantId}/images")
@RequiredArgsConstructor
@Slf4j
public class TenantImageController {

    private final TenantImageService imageService;

    /**
     * Lataa uuden kuvan vuokralaiselle.
     *
     * Pyyntö: multipart/form-data, kenttä "file"
     * Sallitut tyypit: image/jpeg, image/png, image/webp
     * Maksimikoko: määräytyy azure.storage.max-file-size-bytes-asetuksesta (oletus 10 MB)
     * Maksimimäärä: azure.storage.max-images-per-tenant (oletus 5)
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TenantImageResponse> uploadImage(
            @PathVariable UUID tenantId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("Upload image request for tenant {}, file={}, size={}",
                tenantId, file.getOriginalFilename(), file.getSize());

        TenantImageResponse response = imageService.uploadImage(
                tenantId, file, principal == null ? null : principal.getUser());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Listaa vuokralaisen kuvat järjestyksessä (sort_order ASC).
     * Vaatii kirjautumisen, mutta ei omistajuutta.
     * Jokainen kuva sisältää lyhytikäisen SAS URL:n.
     */
    @GetMapping
    public ResponseEntity<List<TenantImageResponse>> listImages(
            @PathVariable UUID tenantId,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.debug("List images request for tenant {}", tenantId);
        return ResponseEntity.ok(imageService.listImages(
                tenantId, principal == null ? null : principal.getUser()));
    }

    /**
     * Päivittää kuvan metadataa.
     *
     * Käyttötapaukset:
     * - { "isPrimary": true }   → aseta profiilikuvaksi
     * - { "sortOrder": 2 }      → vaihda järjestystä
     */
    @PatchMapping("/{imageId}")
    public ResponseEntity<TenantImageResponse> updateImage(
            @PathVariable UUID tenantId,
            @PathVariable UUID imageId,
            @Valid @RequestBody TenantImageUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("Update image {} for tenant {}", imageId, tenantId);

        TenantImageResponse response = imageService.updateImage(
                tenantId, imageId, request, principal == null ? null : principal.getUser());

        return ResponseEntity.ok(response);
    }

    /**
     * Poistaa kuvan tietokannasta ja Azure Blob Storagesta.
     * Jos poistettu kuva oli profiilikuva, seuraava kuva asetetaan automaattisesti uudeksi profiilikuvaksi.
     */
    @DeleteMapping("/{imageId}")
    public ResponseEntity<Void> deleteImage(
            @PathVariable UUID tenantId,
            @PathVariable UUID imageId,
            @AuthenticationPrincipal UserPrincipal principal) {

        log.info("Delete image {} from tenant {}", imageId, tenantId);

        imageService.deleteImage(tenantId, imageId, principal == null ? null : principal.getUser());

        return ResponseEntity.noContent().build();
    }
}
