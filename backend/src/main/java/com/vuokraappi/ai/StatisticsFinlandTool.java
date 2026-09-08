package com.vuokraappi.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Hakee vapaarahoitteisten vuokra-asuntojen neliövuokratilastot
 * Tilastokeskuksen StatFin PxWeb API:sta.
 *
 * Taulukko: statfin_asvu_pxt_13eb.px
 * - Vuosineljännes: viimeisin saatavilla (haetaan dynaamisesti)
 * - Postinumero: haetaan parametrina
 * - Huoneluku: Yksiöt, Kaksiot, Kolmiot+
 * - Tiedot: Neliövuokra (eur/m2) ja Lukumäärä
 *
 * API-dokumentaatio: https://stat.fi/tup/tilastotietokannat/pxweb-api-rajapintojen-kaytto.html
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StatisticsFinlandTool {

    private static final String TABLE_PATH =
            "/PXWeb/api/v1/fi/StatFin/statfin_asvu_pxt_13eb.px";

    private final WebClient statFinWebClient;

    public String fetch(String zipcode) {
        log.info("Fetching Statistics Finland rent data for zipcode={}", zipcode);

        try {
            // Haetaan metadata yhdellä kutsulla: uusin neljännes + postinumeroavain
            Map metadata = fetchMetadata();

            String latestQuarter = extractLatestQuarter(metadata);
            if (latestQuarter == null) {
                latestQuarter = estimateLatestQuarter();
                log.warn("Could not determine latest quarter from metadata, using estimate: {}", latestQuarter);
            }

            String postalKey = extractPostalKey(metadata, zipcode);
            if (postalKey == null) {
                return String.format(
                        "Postinumeroa %s ei löydy Tilastokeskuksen vuokratilastoista. " +
                        "Tieto saattaa puuttua pieniltä tai harvaanasutuilta alueilta.", zipcode);
            }

            log.info("Using quarter={}, postalKey='{}' for zipcode={}", latestQuarter, postalKey, zipcode);
            return fetchRentData(zipcode, postalKey, latestQuarter);

        } catch (WebClientResponseException e) {
            log.error("StatFin API error for zipcode {}: {} - {}",
                    zipcode, e.getStatusCode(), e.getResponseBodyAsString());
            return String.format(
                    "Tilastokeskuksen vuokratilastoja ei saatu haettua postinumerolle %s " +
                    "(HTTP %s).", zipcode, e.getStatusCode());
        } catch (Exception e) {
            log.error("Unexpected error fetching StatFin data for zipcode {}", zipcode, e);
            return String.format(
                    "Tilastokeskuksen vuokratilastoja ei saatu haettua postinumerolle %s.", zipcode);
        }
    }

    @SuppressWarnings("unchecked")
    private Map fetchMetadata() {
        Map metadata = statFinWebClient.get()
                .uri(TABLE_PATH)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        // Logitetaan muuttujien nimet ja muutama arvo debuggausta varten
        if (metadata != null && log.isDebugEnabled()) {
            List<Map> variables = (List<Map>) metadata.get("variables");
            if (variables != null) {
                for (Map v : variables) {
                    List<String> vals = (List<String>) v.get("values");
                    int count = vals != null ? vals.size() : 0;
                    String sample = vals != null && count > 0
                            ? vals.get(0) + " ... " + vals.get(count - 1)
                            : "none";
                    log.debug("Variable '{}': {} values, sample: {}",
                            v.get("code"), count, sample);
                }
            }
        }
        return metadata;
    }

    @SuppressWarnings("unchecked")
    private String extractLatestQuarter(Map metadata) {
        try {
            if (metadata == null) return null;
            List<Map> variables = (List<Map>) metadata.get("variables");
            if (variables == null) return null;
            for (Map variable : variables) {
                if ("Vuosineljännes".equals(variable.get("code"))) {
                    List<String> values = (List<String>) variable.get("values");
                    if (values != null && !values.isEmpty()) {
                        // Arvot nousevassa järjestyksessä – viimeinen on uusin
                        return values.get(values.size() - 1);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not extract latest quarter from metadata", e);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String extractPostalKey(Map metadata, String zipcode) {
        try {
            if (metadata == null) return null;
            List<Map> variables = (List<Map>) metadata.get("variables");
            if (variables == null) return null;
            for (Map variable : variables) {
                if ("Postinumero".equals(variable.get("code"))) {
                    List<String> values = (List<String>) variable.get("values");
                    if (values == null) return null;
                    return values.stream()
                            .filter(v -> v.startsWith(zipcode))
                            .findFirst()
                            .orElse(null);
                }
            }
        } catch (Exception e) {
            log.warn("Could not extract postal key for zipcode {}", zipcode, e);
        }
        return null;
    }

    /**
     * Arvioi uusimman saatavilla olevan neljänneksen nykyisestä päivämäärästä.
     * StatFin päivittyy n. 1 kvartaali jäljessä.
     */
    private String estimateLatestQuarter() {
        LocalDate now = LocalDate.now();
        int year = now.getYear();
        int month = now.getMonthValue();

        int quarter;
        if (month <= 4) {
            quarter = 3; year = year - 1;
        } else if (month <= 7) {
            quarter = 4; year = year - 1;
        } else if (month <= 10) {
            quarter = 1;
        } else {
            quarter = 2;
        }
        return String.format("%dQ%d", year, quarter);
    }

    /**
     * Hakee vuokratiedot PxWeb POST-kyselyllä json-stat2-muodossa.
     *
     * Postinumerot taulukossa ovat muodossa "00530 Kallio (Helsinki )" –
     * haetaan ensin metadatasta se arvo jonka koodi alkaa haetulla postinumerolla.
     */
    @SuppressWarnings("unchecked")
    private String fetchRentData(String zipcode, String postalKey, String quarter) {

        String queryBody = String.format("""
                {
                  "query": [
                    {
                      "code": "Vuosineljännes",
                      "selection": { "filter": "item", "values": ["%s"] }
                    },
                    {
                      "code": "Postinumero",
                      "selection": { "filter": "item", "values": ["%s"] }
                    },
                    {
                      "code": "Huoneluku",
                      "selection": { "filter": "item", "values": ["01", "02", "03"] }
                    },
                    {
                      "code": "Tiedot",
                      "selection": { "filter": "item", "values": ["lkm_ptno", "keskivuokra"] }
                    }
                  ],
                  "response": { "format": "json-stat2" }
                }
                """, quarter, postalKey);

        log.debug("StatFin query for zipcode={}, quarter={}", zipcode, quarter);
        log.debug("StatFin query body: {}", queryBody);

        Map response = statFinWebClient.post()
                .uri(TABLE_PATH)
                .header("Content-Type", "application/json")
                .bodyValue(queryBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        return parseAndFormat(response, zipcode, quarter);
    }

    /**
     * Parsii json-stat2-vastauksen tekstimuotoiseksi yhteenvedoksi.
     *
     * json-stat2-arvojen järjestys on muuttujien karteesinen tulo:
     * Huoneluku (3) x Tiedot (2) = 6 arvoa:
     * [Yksiöt/neliövuokra, Yksiöt/lkm, Kaksiot/neliövuokra, Kaksiot/lkm, Kolmiot+/neliövuokra, Kolmiot+/lkm]
     */
    @SuppressWarnings("unchecked")
    private String parseAndFormat(Map response, String zipcode, String quarter) {
        if (response == null) {
            return String.format("Ei vuokratilastoja saatavilla postinumerolle %s.", zipcode);
        }

        try {
            List<Object> values = (List<Object>) response.get("value");

            if (values == null || values.stream().allMatch(v -> v == null)) {
                return String.format(
                        "Tilastokeskuksella ei ole riittävästi vuokratietoja postinumerolle %s " +
                        "(alle 20 havaintoa tai tiedot peitetty).", zipcode);
            }

            // Haetaan postinumeron alueen nimi
            Map<String, Object> dimension = (Map<String, Object>) response.get("dimension");
            String areaName = extractAreaName(dimension);

            StringBuilder sb = new StringBuilder();
            sb.append(String.format(
                    "Tilastokeskus – Vapaarahoitteiset vuokrat, %s (%s):\n\n", areaName, quarter));

            String[] roomLabels = {"Yksiöt", "Kaksiot", "Kolmiot+"};
            for (int i = 0; i < roomLabels.length; i++) {
                Object rentValue  = values.size() > i * 2     ? values.get(i * 2)     : null;
                Object countValue = values.size() > i * 2 + 1 ? values.get(i * 2 + 1) : null;

                sb.append(String.format("%-12s", roomLabels[i] + ":"));
                if (rentValue != null) {
                    // StatFin palauttaa neliövuokrat 10x skaalattuna (esim. 219 = 21.9 €/m²)
                    sb.append(String.format("%.1f €/m²", toDouble(rentValue) / 10.0));
                    if (countValue != null) {
                        sb.append(String.format("  (%s havaintoa)", countValue));
                    }
                } else {
                    sb.append("ei tietoja (alle 20 havaintoa)");
                }
                sb.append("\n");
            }

            sb.append("\nLähde: Tilastokeskus, Asuntojen vuokrat. " +
                      "Neliövuokrat ovat painotettuja geometrisia keskiarvoja.");
            return sb.toString();

        } catch (Exception e) {
            log.error("Error parsing StatFin response for zipcode {}", zipcode, e);
            return String.format("Vuokratilastojen käsittely epäonnistui postinumerolle %s.", zipcode);
        }
    }

    @SuppressWarnings("unchecked")
    private String extractAreaName(Map<String, Object> dimension) {
        try {
            if (dimension == null) return "";
            Map<String, Object> postalDim = (Map<String, Object>) dimension.get("Postinumero");
            if (postalDim == null) return "";
            Map<String, Object> category = (Map<String, Object>) postalDim.get("category");
            if (category == null) return "";
            Map<String, String> labels = (Map<String, String>) category.get("label");
            if (labels == null || labels.isEmpty()) return "";
            return labels.values().iterator().next();
        } catch (Exception e) {
            return "";
        }
    }

    private double toDouble(Object value) {
        if (value instanceof Number) return ((Number) value).doubleValue();
        if (value instanceof String) return Double.parseDouble((String) value);
        return 0.0;
    }
}