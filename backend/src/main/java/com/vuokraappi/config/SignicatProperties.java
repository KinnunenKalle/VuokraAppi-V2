package com.vuokraappi.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.Base64;

@Configuration
@ConfigurationProperties(prefix = "signicat")
@Data
public class SignicatProperties {

    /** Signicatin client ID */
    private String clientId;

    /** Signicatin client secret */
    private String clientSecret;

    /**
     * Signicatin OIDC base URL.
     * Testi: https://id.test.signicat.com/oidc
     * Tuotanto: https://id.signicat.com/oidc
     */
    private String baseUrl;

    /** Callback-URL jonne Signicat ohjaa tunnistautumisen jälkeen */
    private String redirectUri;

    /** Frontend-URL johon käyttäjä ohjataan tunnistautumisen jälkeen */
    private String frontendRedirectUrl;

    /**
     * HMAC-avain identity_verifications-taulun hakuavaimen laskemiseen.
     * Vähintään 32 merkkiä. Ympäristömuuttuja: IDENTITY_LOOKUP_SECRET
     */
    private String lookupSecret;

    /**
     * AES-256 salausavain (base64-enkoodattu, 32 tavua).
     * Ympäristömuuttuja: IDENTITY_ENCRYPTION_KEY
     */
    private String encryptionKey;

    public byte[] getEncryptionKeyBytes() {
        return Base64.getDecoder().decode(encryptionKey);
    }

    public byte[] getLookupSecretBytes() {
        return lookupSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }
}
