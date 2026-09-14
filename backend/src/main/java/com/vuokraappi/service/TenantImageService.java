package com.vuokraappi.service;

import com.vuokraappi.config.BlobStorageProperties;
import com.vuokraappi.dto.TenantImageResponse;
import com.vuokraappi.dto.TenantImageUpdateRequest;
import com.vuokraappi.entity.Tenant;
import com.vuokraappi.entity.TenantImage;
import com.vuokraappi.entity.User;
import com.vuokraappi.exception.ResourceNotFoundException;
import com.vuokraappi.exception.UnauthorizedException;
import com.vuokraappi.repository.TenantImageRepository;
import com.vuokraappi.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TenantImageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final TenantImageRepository imageRepository;
    private final TenantRepository tenantRepository;
    private final BlobStorageService blobStorageService;
    private final BlobStorageProperties blobStorageProperties;

    /**
     * Lataa uuden kuvan vuokralaiselle.
     *
     * Validoi:
     * - Vuokralainen on olemassa ja pyytäjä on kyseinen vuokralainen itse
     * - Tiedostotyyppi on sallittu (jpeg, png, webp)
     * - Tiedostokoko ei ylitä rajaa
     * - Kuvamäärä ei ylitä rajaa (max 5)
     *
     * Jos vuokralaisella ei vielä ole kuvia, ladattu kuva asetetaan automaattisesti profiilikuvaksi.
     */
    @Transactional
    public TenantImageResponse uploadImage(UUID tenantId, MultipartFile file, User currentUser) {
        Tenant tenant = getTenantAndVerifyOwnership(tenantId, currentUser);

        validateFile(file);
        validateImageCount(tenantId);

        String blobName = blobStorageService.uploadTenantImage(tenantId, file);

        int sortOrder = imageRepository.getNextSortOrder(tenantId);
        boolean isFirstImage = (sortOrder == 0);

        TenantImage image = new TenantImage();
        image.setTenant(tenant);
        image.setBlobName(blobName);
        image.setFilename(file.getOriginalFilename());
        image.setContentType(file.getContentType());
        image.setFileSize(file.getSize());
        image.setSortOrder(sortOrder);
        image.setIsPrimary(isFirstImage); // ensimmäinen kuva on automaattisesti profiilikuva

        TenantImage saved = imageRepository.save(image);
        log.info("Image uploaded for tenant {}: blob={}, isPrimary={}",
                tenantId, blobName, isFirstImage);

        return toResponse(saved);
    }

    /**
     * Listaa vuokralaisen kuvat järjestyksessä.
     * Generoi jokaiselle kuvalle uuden SAS URL:n.
     *
     * Vaatii kirjautumisen, mutta ei omistajuutta – esim. vuokranantajat näkevät
     * kuvat vuokralaishaun kautta.
     */
    @Transactional(readOnly = true)
    public List<TenantImageResponse> listImages(UUID tenantId, User currentUser) {
        requireAuthenticated(currentUser);

        if (!tenantRepository.existsById(tenantId)) {
            throw new ResourceNotFoundException("Vuokralaista ei löydy id:llä: " + tenantId);
        }

        return imageRepository.findByTenantIdOrderBySortOrderAsc(tenantId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Päivittää kuvan metadataa (isPrimary, sortOrder).
     *
     * Jos isPrimary asetetaan true:ksi, muiden kuvien primary-flag nollataan ensin.
     */
    @Transactional
    public TenantImageResponse updateImage(UUID tenantId, UUID imageId,
                                            TenantImageUpdateRequest request,
                                            User currentUser) {
        getTenantAndVerifyOwnership(tenantId, currentUser);

        TenantImage image = imageRepository.findByIdAndTenantId(imageId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Kuvaa ei löydy id:llä: " + imageId));

        if (request.getIsPrimary() != null && request.getIsPrimary()) {
            imageRepository.clearPrimaryForTenant(tenantId);
            image.setIsPrimary(true);
            log.info("Set image {} as primary for tenant {}", imageId, tenantId);
        }

        if (request.getSortOrder() != null) {
            image.setSortOrder(request.getSortOrder());
            log.info("Updated sort order for image {} to {}", imageId, request.getSortOrder());
        }

        return toResponse(imageRepository.save(image));
    }

    /**
     * Poistaa kuvan tietokannasta ja Azure Blob Storagesta.
     *
     * Jos poistettu kuva oli profiilikuva, asetetaan seuraava jäljelle jäävä kuva
     * (pienin sort_order) automaattisesti uudeksi profiilikuvaksi.
     */
    @Transactional
    public void deleteImage(UUID tenantId, UUID imageId, User currentUser) {
        getTenantAndVerifyOwnership(tenantId, currentUser);

        TenantImage image = imageRepository.findByIdAndTenantId(imageId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Kuvaa ei löydy id:llä: " + imageId));

        boolean wasPrimary = image.getIsPrimary();
        String blobName = image.getBlobName();

        imageRepository.delete(image);
        log.info("Deleted image record {} for tenant {}", imageId, tenantId);

        // Poistetaan blobista – ei peruuta tietokantapoistoa jos epäonnistuu,
        // mutta logitetaan virhe. Orpojen blobien siivous voidaan tehdä scheduled jobissa.
        try {
            blobStorageService.deleteTenantBlob(blobName);
        } catch (Exception e) {
            log.error("Failed to delete blob {} from storage, orphan blob cleanup needed", blobName, e);
        }

        if (wasPrimary) {
            List<TenantImage> remaining =
                    imageRepository.findByTenantIdOrderBySortOrderAsc(tenantId);
            if (!remaining.isEmpty()) {
                TenantImage newPrimary = remaining.get(0);
                newPrimary.setIsPrimary(true);
                imageRepository.save(newPrimary);
                log.info("Auto-assigned new primary image {} for tenant {}",
                        newPrimary.getId(), tenantId);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Tenant getTenantAndVerifyOwnership(UUID tenantId, User currentUser) {
        requireAuthenticated(currentUser);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vuokralaista ei löydy id:llä: " + tenantId));

        if (!tenant.getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Voit hallita vain omia kuviasi");
        }

        return tenant;
    }

    private void requireAuthenticated(User currentUser) {
        if (currentUser == null) {
            throw new UnauthorizedException("Kirjautuminen vaaditaan");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Tiedosto ei voi olla tyhjä");
        }

        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException(
                    "Tiedostotyyppi ei ole sallittu. Sallitut tyypit: JPEG, PNG, WebP");
        }

        if (file.getSize() > blobStorageProperties.getMaxFileSizeBytes()) {
            long maxMb = blobStorageProperties.getMaxFileSizeBytes() / (1024 * 1024);
            throw new IllegalArgumentException(
                    "Tiedosto on liian suuri. Maksimikoko: " + maxMb + " MB");
        }
    }

    private void validateImageCount(UUID tenantId) {
        int count = imageRepository.countByTenantId(tenantId);
        if (count >= blobStorageProperties.getMaxImagesPerTenant()) {
            throw new IllegalArgumentException(
                    "Sinulla on jo maksimimäärä kuvia (" +
                    blobStorageProperties.getMaxImagesPerTenant() + ")");
        }
    }

    private TenantImageResponse toResponse(TenantImage image) {
        String sasUrl = blobStorageService.generateTenantSasUrl(image.getBlobName());

        return TenantImageResponse.builder()
                .id(image.getId())
                .url(sasUrl)
                .filename(image.getFilename())
                .contentType(image.getContentType())
                .fileSizeBytes(image.getFileSize())
                .sortOrder(image.getSortOrder())
                .isPrimary(image.getIsPrimary())
                .uploadedAt(image.getUploadedAt())
                .build();
    }
}
