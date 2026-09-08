package com.vuokraappi.service;

import com.vuokraappi.config.BlobStorageProperties;
import com.vuokraappi.dto.ApartmentImageResponse;
import com.vuokraappi.dto.ApartmentImageUpdateRequest;
import com.vuokraappi.entity.Apartment;
import com.vuokraappi.entity.ApartmentImage;
import com.vuokraappi.entity.User;
import com.vuokraappi.exception.ResourceNotFoundException;
import com.vuokraappi.exception.UnauthorizedException;
import com.vuokraappi.repository.ApartmentImageRepository;
import com.vuokraappi.repository.ApartmentRepository;
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
public class ApartmentImageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final ApartmentImageRepository imageRepository;
    private final ApartmentRepository apartmentRepository;
    private final BlobStorageService blobStorageService;
    private final BlobStorageProperties blobStorageProperties;

    /**
     * Lataa uuden kuvan asunnolle.
     *
     * Validoi:
     * - Asunto on olemassa ja käyttäjä on sen omistaja
     * - Tiedostotyyppi on sallittu (jpeg, png, webp)
     * - Tiedostokoko ei ylitä rajaa
     * - Kuvamäärä ei ylitä rajaa
     *
     * Jos asunnolla ei vielä ole kuvia, ladattu kuva asetetaan automaattisesti pääkuvaksi.
     */
    @Transactional
    public ApartmentImageResponse uploadImage(UUID apartmentId, MultipartFile file, User currentUser) {
        Apartment apartment = getApartmentAndVerifyOwnership(apartmentId, currentUser);

        validateFile(file);
        validateImageCount(apartmentId);

        // Upload blobiin
        String blobName = blobStorageService.uploadImage(apartmentId, file);

        // Selvitetään sort_order ja isPrimary
        int sortOrder = imageRepository.getNextSortOrder(apartmentId);
        boolean isFirstImage = (sortOrder == 0);

        ApartmentImage image = new ApartmentImage();
        image.setApartment(apartment);
        image.setBlobName(blobName);
        image.setFilename(file.getOriginalFilename());
        image.setContentType(file.getContentType());
        image.setFileSize(file.getSize());
        image.setSortOrder(sortOrder);
        image.setIsPrimary(isFirstImage); // ensimmäinen kuva on automaattisesti pääkuva

        ApartmentImage saved = imageRepository.save(image);
        log.info("Image uploaded for apartment {}: blob={}, isPrimary={}",
                apartmentId, blobName, isFirstImage);

        return toResponse(saved);
    }

    /**
     * Listaa asunnon kuvat järjestyksessä.
     * Generoi jokaiselle kuvalle uuden SAS URL:n.
     *
     * Tätä endpointtia voi kutsua julkisesti – asunnon katselijat tarvitsevat kuvat.
     */
    @Transactional(readOnly = true)
    public List<ApartmentImageResponse> listImages(UUID apartmentId) {
        if (!apartmentRepository.existsById(apartmentId)) {
            throw new ResourceNotFoundException("Asuntoa ei löydy id:llä: " + apartmentId);
        }

        return imageRepository.findByApartmentIdOrderBySortOrderAsc(apartmentId)
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
    public ApartmentImageResponse updateImage(UUID apartmentId, UUID imageId,
                                              ApartmentImageUpdateRequest request,
                                              User currentUser) {
        getApartmentAndVerifyOwnership(apartmentId, currentUser);

        ApartmentImage image = imageRepository.findByIdAndApartmentId(imageId, apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Kuvaa ei löydy id:llä: " + imageId));

        if (request.getIsPrimary() != null && request.getIsPrimary()) {
            // Nollaa muiden kuvien primary-flag ja aseta tälle
            imageRepository.clearPrimaryForApartment(apartmentId);
            image.setIsPrimary(true);
            log.info("Set image {} as primary for apartment {}", imageId, apartmentId);
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
     * Jos poistettu kuva oli pääkuva, asetetaan seuraava jäljelle jäävä kuva
     * (pienin sort_order) automaattisesti uudeksi pääkuvaksi.
     */
    @Transactional
    public void deleteImage(UUID apartmentId, UUID imageId, User currentUser) {
        getApartmentAndVerifyOwnership(apartmentId, currentUser);

        ApartmentImage image = imageRepository.findByIdAndApartmentId(imageId, apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Kuvaa ei löydy id:llä: " + imageId));

        boolean wasPrimary = image.getIsPrimary();
        String blobName = image.getBlobName();

        // Poistetaan tietokannasta ensin
        imageRepository.delete(image);
        log.info("Deleted image record {} for apartment {}", imageId, apartmentId);

        // Poistetaan blobista – ei peruuta tietokantapoistoa jos epäonnistuu,
        // mutta logitetaan virhe. Orpojen blobien siivous voidaan tehdä scheduled jobissa.
        try {
            blobStorageService.deleteBlob(blobName);
        } catch (Exception e) {
            log.error("Failed to delete blob {} from storage, orphan blob cleanup needed", blobName, e);
        }

        // Jos poistettu kuva oli primary, aseta uusi primary automaattisesti
        if (wasPrimary) {
            List<ApartmentImage> remaining =
                    imageRepository.findByApartmentIdOrderBySortOrderAsc(apartmentId);
            if (!remaining.isEmpty()) {
                ApartmentImage newPrimary = remaining.get(0);
                newPrimary.setIsPrimary(true);
                imageRepository.save(newPrimary);
                log.info("Auto-assigned new primary image {} for apartment {}", 
                        newPrimary.getId(), apartmentId);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Apartment getApartmentAndVerifyOwnership(UUID apartmentId, User currentUser) {
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Asuntoa ei löydy id:llä: " + apartmentId));

        if (!apartment.getOwner().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Voit hallita vain omia asuntojasi");
        }

        return apartment;
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

    private void validateImageCount(UUID apartmentId) {
        int count = imageRepository.countByApartmentId(apartmentId);
        if (count >= blobStorageProperties.getMaxImagesPerApartment()) {
            throw new IllegalArgumentException(
                    "Asunnolla on jo maksimimäärä kuvia (" +
                    blobStorageProperties.getMaxImagesPerApartment() + ")");
        }
    }

    private ApartmentImageResponse toResponse(ApartmentImage image) {
        String sasUrl = blobStorageService.generateSasUrl(image.getBlobName());

        return ApartmentImageResponse.builder()
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