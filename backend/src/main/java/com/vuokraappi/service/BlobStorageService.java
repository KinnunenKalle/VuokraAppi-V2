package com.vuokraappi.service;

import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;
import com.vuokraappi.config.BlobStorageProperties;
import com.vuokraappi.exception.BlobStorageException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BlobStorageService {

    private final BlobStorageProperties blobStorageProperties;

    private BlobContainerClient containerClient;
    private BlobContainerClient tenantContainerClient;

    @PostConstruct
    public void init() {
        String connectionString = blobStorageProperties.getConnectionString();

        if (connectionString == null || connectionString.isBlank()) {
            throw new IllegalStateException(
                "Azure Blob Storage connection string puuttuu. " +
                "Aseta ympäristömuuttuja AZURE_STORAGE_CONNECTION_STRING.");
        }

        try {
            BlobServiceClient serviceClient = new BlobServiceClientBuilder()
                    .connectionString(connectionString)
                    .buildClient();

            containerClient = getOrCreateContainer(serviceClient, blobStorageProperties.getContainerName());
            tenantContainerClient = getOrCreateContainer(serviceClient, blobStorageProperties.getTenantContainerName());

            log.info("Azure Blob Storage initialized, containers: {}, {}",
                    blobStorageProperties.getContainerName(),
                    blobStorageProperties.getTenantContainerName());

        } catch (Exception e) {
            throw new IllegalStateException(
                "Azure Blob Storage -alustus epäonnistui. " +
                "Tarkista AZURE_STORAGE_CONNECTION_STRING.", e);
        }
    }

    private BlobContainerClient getOrCreateContainer(BlobServiceClient serviceClient, String containerName) {
        BlobContainerClient client = serviceClient.getBlobContainerClient(containerName);
        if (!client.exists()) {
            log.info("Creating blob container: {}", containerName);
            client.create();
        }
        return client;
    }

    /**
     * Lataa kuvatiedoston Azure Blob Storageen.
     *
     * Blob-polku: {apartmentId}/{imageId}.{extension}
     * Esim: "550e8400-e29b-41d4-a716-446655440000/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpg"
     *
     * @return blobName – tallennetaan tietokantaan, käytetään myöhemmin URL:n generointiin
     */
    public String uploadImage(UUID apartmentId, MultipartFile file) {
        return uploadToContainer(containerClient, apartmentId, file);
    }

    /**
     * Lataa vuokralaisen kuvatiedoston Azure Blob Storageen (erillinen container).
     * Blob-polku: {tenantId}/{imageId}.{extension}
     */
    public String uploadTenantImage(UUID tenantId, MultipartFile file) {
        return uploadToContainer(tenantContainerClient, tenantId, file);
    }

    private String uploadToContainer(BlobContainerClient client, UUID ownerId, MultipartFile file) {
        String extension = extractExtension(file.getOriginalFilename());
        String blobName = ownerId + "/" + UUID.randomUUID() + "." + extension;

        try {
            BlobClient blobClient = client.getBlobClient(blobName);

            // Aseta Content-Type oikein jotta selain osaa näyttää kuvan
            BlobHttpHeaders headers = new BlobHttpHeaders()
                    .setContentType(file.getContentType());

            blobClient.upload(file.getInputStream(), file.getSize(), true);
            blobClient.setHttpHeaders(headers);

            log.info("Uploaded blob: {} ({} bytes)", blobName, file.getSize());
            return blobName;

        } catch (IOException e) {
            log.error("Failed to read file for upload: {}", file.getOriginalFilename(), e);
            throw new BlobStorageException("Tiedoston lukeminen epäonnistui", e);
        } catch (Exception e) {
            log.error("Failed to upload blob: {}", blobName, e);
            throw new BlobStorageException("Kuvan tallennus Azure Blobiin epäonnistui", e);
        }
    }

    /**
     * Generoi lyhytikäisen SAS URL:n yksittäiselle blobille.
     *
     * SAS (Shared Access Signature) antaa lukuoikeuden tiettyyn blobiin
     * ilman että container tarvitsee olla julkinen.
     *
     * Voimassaolo määräytyy azure.storage.sas-expiration-hours-asetuksesta.
     */
    public String generateSasUrl(String blobName) {
        return generateSasUrlFor(containerClient, blobName);
    }

    /** Generoi lyhytikäisen SAS URL:n vuokralaisen kuvalle (tenant-images -container). */
    public String generateTenantSasUrl(String blobName) {
        return generateSasUrlFor(tenantContainerClient, blobName);
    }

    private String generateSasUrlFor(BlobContainerClient client, String blobName) {
        try {
            BlobClient blobClient = client.getBlobClient(blobName);

            OffsetDateTime expiryTime = OffsetDateTime.now()
                    .plusHours(blobStorageProperties.getSasExpirationHours());

            BlobSasPermission permission = new BlobSasPermission().setReadPermission(true);

            BlobServiceSasSignatureValues sasValues = new BlobServiceSasSignatureValues(
                    expiryTime, permission)
                    .setStartTime(OffsetDateTime.now().minusMinutes(5)); // 5min slack kelloneroille

            String sasToken = blobClient.generateSas(sasValues);
            String sasUrl = blobClient.getBlobUrl() + "?" + sasToken;

            log.debug("Generated SAS URL for blob: {}, expires: {}", blobName, expiryTime);
            return sasUrl;

        } catch (Exception e) {
            log.error("Failed to generate SAS URL for blob: {}", blobName, e);
            throw new BlobStorageException("SAS URL:n generointi epäonnistui", e);
        }
    }

    /**
     * Poistaa blobin Azure Blob Storagesta.
     * Ei heitä poikkeusta jos blobi ei enää ole olemassa (idempotent).
     */
    public void deleteBlob(String blobName) {
        deleteFromContainer(containerClient, blobName);
    }

    /** Poistaa vuokralaisen kuvablobin (tenant-images -container). Idempotent. */
    public void deleteTenantBlob(String blobName) {
        deleteFromContainer(tenantContainerClient, blobName);
    }

    private void deleteFromContainer(BlobContainerClient client, String blobName) {
        try {
            BlobClient blobClient = client.getBlobClient(blobName);
            if (blobClient.exists()) {
                blobClient.delete();
                log.info("Deleted blob: {}", blobName);
            } else {
                log.warn("Blob not found for deletion (already deleted?): {}", blobName);
            }
        } catch (Exception e) {
            log.error("Failed to delete blob: {}", blobName, e);
            throw new BlobStorageException("Kuvan poisto Azure Blobista epäonnistui", e);
        }
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "jpg"; // fallback
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}