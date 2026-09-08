package com.vuokraappi.service;

import com.vuokraappi.config.SignicatProperties;
import com.vuokraappi.entity.IdentityVerification;
import com.vuokraappi.entity.User;
import com.vuokraappi.exception.ResourceNotFoundException;
import com.vuokraappi.exception.UserNotFoundException;
import com.vuokraappi.repository.IdentityVerificationRepository;
import com.vuokraappi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class SignicatAuthService {

    private final SignicatProperties properties;
    private final WebClient webClient;
    private final UserRepository userRepository;
    private final IdentityVerificationRepository identityVerificationRepository;

    public SignicatAuthService(SignicatProperties properties,
                              @Qualifier("signicatWebClient") WebClient webClient,
                              UserRepository userRepository,
                              IdentityVerificationRepository identityVerificationRepository) {
        this.properties = properties;
        this.webClient = webClient;
        this.userRepository = userRepository;
        this.identityVerificationRepository = identityVerificationRepository;
    }

    private final ConcurrentHashMap<String, StateEntry> pendingStates = new ConcurrentHashMap<>();

    private record StateEntry(UUID userId, Instant expiresAt) {}

    /**
     * Käynnistää tunnistautumisflow'n. Palauttaa URL:n johon frontend ohjaa käyttäjän.
     */
    public String startVerification(UUID userId) {
        userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        String state = UUID.randomUUID().toString();
        pendingStates.put(state, new StateEntry(userId, Instant.now().plusSeconds(600)));

        return properties.getBaseUrl() + "/authorize" +
            "?client_id=" + properties.getClientId() +
            "&response_type=code" +
            "&scope=openid+profile+signicat.national_id" +
            "&redirect_uri=" + encodeUrl(properties.getRedirectUri()) +
            "&state=" + state +
            "&acr_values=urn:signicat:oidc:method:ftn" +
            "&ui_locales=fi";
    }

    /**
     * Käsittelee Signicatin callbackin. Vaihtaa koodin tokeniin, lukee userinfo-tiedot
     * ja tallentaa vahvistetut tiedot kantaan.
     */
    @Transactional
    public void handleCallback(String code, String state) {
        UUID userId = consumeState(state);

        Map<String, Object> tokenResponse = exchangeCodeForToken(code);
        String accessToken = (String) tokenResponse.get("access_token");

        Map<String, Object> userInfo = fetchUserInfo(accessToken);
        log.info("Received userinfo from Signicat for user {}", userId);

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        // Ylikirjoitetaan käyttäjän perustiedot Signicatin vahvistetuilla tiedoilla
        if (userInfo.get("given_name") != null) user.setFirstName((String) userInfo.get("given_name"));
        if (userInfo.get("family_name") != null) user.setLastName((String) userInfo.get("family_name"));
        if (userInfo.get("birthdate") != null) {
            user.setDateOfBirth(LocalDate.parse((String) userInfo.get("birthdate")));
        }
        user.setIdentityVerified(true);
        user.setIdentityVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        // Tallennetaan salattu henkilötunnus erilliseen tauluun ilman suoraa FK:ta
        String nationalId = (String) userInfo.get("signicat.national_id");
        if (nationalId != null) {
            UUID lookupId = computeLookupId(userId);
            IdentityVerification verification = new IdentityVerification();
            verification.setId(lookupId);
            verification.setEncryptedHetu(encrypt(nationalId));
            identityVerificationRepository.save(verification);
            log.info("Stored encrypted national ID for user {}", userId);
        }
    }

    /**
     * Lukee käyttäjän henkilötunnuksen. Palauttaa null jos ei ole tunnistautunut.
     */
    public String getDecryptedHetu(UUID userId) {
        UUID lookupId = computeLookupId(userId);
        return identityVerificationRepository.findById(lookupId)
            .map(v -> decrypt(v.getEncryptedHetu()))
            .orElse(null);
    }

    // --- Sisäiset apumetodit ---

    private UUID consumeState(String state) {
        StateEntry entry = pendingStates.remove(state);
        if (entry == null) {
            throw new ResourceNotFoundException("Tuntematon tai vanhentunut tunnistautumistila");
        }
        if (entry.expiresAt().isBefore(Instant.now())) {
            throw new ResourceNotFoundException("Tunnistautumistila on vanhentunut");
        }
        // Siivotaan vanhentuneet tilat samalla
        pendingStates.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(Instant.now()));
        return entry.userId();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> exchangeCodeForToken(String code) {
        String credentials = Base64.getEncoder().encodeToString(
            (properties.getClientId() + ":" + properties.getClientSecret()).getBytes());

        return webClient.post()
            .uri(properties.getBaseUrl() + "/token")
            .header("Authorization", "Basic " + credentials)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(BodyInserters.fromFormData("grant_type", "authorization_code")
                .with("code", code)
                .with("redirect_uri", properties.getRedirectUri()))
            .retrieve()
            .bodyToMono(Map.class)
            .block();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchUserInfo(String accessToken) {
        return webClient.get()
            .uri(properties.getBaseUrl() + "/userinfo")
            .header("Authorization", "Bearer " + accessToken)
            .retrieve()
            .bodyToMono(Map.class)
            .block();
    }

    /**
     * Laskee deterministisen UUID:n HMAC-SHA256(userId, lookupSecret) avulla.
     * Sama userId tuottaa aina saman UUID:n, mutta ilman lookupSecretiä
     * userId:n ja identity_verifications.id:n välistä yhteyttä ei voi laskea.
     */
    private UUID computeLookupId(UUID userId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(properties.getLookupSecretBytes(), "HmacSHA256"));
            byte[] hmac = mac.doFinal(userId.toString().getBytes());
            byte[] truncated = Arrays.copyOf(hmac, 16);
            ByteBuffer bb = ByteBuffer.wrap(truncated);
            return new UUID(bb.getLong(), bb.getLong());
        } catch (Exception e) {
            throw new RuntimeException("HMAC-laskenta epäonnistui", e);
        }
    }

    /**
     * Salaa plaintext AES-256-GCM:llä.
     * Tallennetaan muodossa: base64(iv):base64(ciphertext+tag)
     */
    private String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE,
                new SecretKeySpec(properties.getEncryptionKeyBytes(), "AES"),
                new GCMParameterSpec(128, iv));

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes());
            return Base64.getEncoder().encodeToString(iv) + ":" +
                   Base64.getEncoder().encodeToString(ciphertext);
        } catch (Exception e) {
            throw new RuntimeException("Salaus epäonnistui", e);
        }
    }

    /**
     * Purkaa encrypt()-metodilla salatun tekstin.
     */
    private String decrypt(String encrypted) {
        try {
            String[] parts = encrypted.split(":", 2);
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ciphertext = Base64.getDecoder().decode(parts[1]);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,
                new SecretKeySpec(properties.getEncryptionKeyBytes(), "AES"),
                new GCMParameterSpec(128, iv));

            return new String(cipher.doFinal(ciphertext));
        } catch (Exception e) {
            throw new RuntimeException("Salauksen purku epäonnistui", e);
        }
    }

    private String encodeUrl(String url) {
        return java.net.URLEncoder.encode(url, java.nio.charset.StandardCharsets.UTF_8);
    }
}
