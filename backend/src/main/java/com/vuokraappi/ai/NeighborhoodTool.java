package com.vuokraappi.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Hakee kaupunginosa- ja lähipalvelutiedot kahdessa vaiheessa:
 * 1. Nominatim (OpenStreetMap): katuosoite + postinumero → koordinaatit
 * 2. Overpass API (OpenStreetMap): koordinaatit → lähipalvelut 1000m säteellä
 *
 * Molemmat palvelut ovat ilmaisia ja avoimia, ei API-avainta tarvita.
 * Nominatim usage policy: max 1 req/s, User-Agent pakollinen.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NeighborhoodTool {

    private static final int SEARCH_RADIUS_METERS = 1000;
    private static final String USER_AGENT = "vuokraappi/1.0 (rental listing assistant)";

    private final WebClient nominatimWebClient;
    private final WebClient overpassWebClient;

    public String fetch(String zipcode, String city, String streetAddress) {
        log.info("Fetching neighborhood info: streetAddress={}, zipcode={}, city={}",
                streetAddress, zipcode, city);

        try {
            // Vaihe 1: Geocoding - katuosoite koordinaateiksi
            double[] coords = geocode(streetAddress, zipcode, city);
            if (coords == null) {
                log.warn("Geocoding failed for address: {} {} {}", streetAddress, zipcode, city);
                return "Kaupunginosa- ja palvelutietoja ei voitu hakea: osoitetta ei löydy kartalta.";
            }

            double lat = coords[0];
            double lon = coords[1];
            log.info("Geocoded '{} {}' to lat={}, lon={}", streetAddress, zipcode, lat, lon);

            // Vaihe 2: Lähipalvelut Overpass API:lla
            return fetchNearbyServices(lat, lon, streetAddress, zipcode, city);

        } catch (Exception e) {
            log.error("Error fetching neighborhood info for {} {}", streetAddress, zipcode, e);
            return "Kaupunginosa- ja palvelutietoja ei voitu hakea teknisen virheen vuoksi.";
        }
    }

    /**
     * Muuntaa osoitteen koordinaateiksi Nominatim-palvelun avulla.
     *
     * Strategia:
     * 1. Ensin haetaan tarkalla osoitteella (katu + postinumero + kaupunki)
     * 2. Jos ei löydy, yritetään pelkällä postinumerolla (fallback)
     *
     * Palauttaa [lat, lon] tai null jos osoitetta ei löydy.
     */
    @SuppressWarnings("unchecked")
    private double[] geocode(String streetAddress, String zipcode, String city) {
        // Yritys 1: Tarkka haku katuosoitteella
        log.debug("Geocoding with full address: street={}, postalcode={}, city={}",
                streetAddress, zipcode, city);

        List<Map> results = nominatimWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam("street", streetAddress)
                        .queryParam("postalcode", zipcode)
                        .queryParam("city", city)
                        .queryParam("country", "Finland")
                        .queryParam("format", "json")
                        .queryParam("limit", "1")
                        .build())
                .header("User-Agent", USER_AGENT)
                .retrieve()
                .bodyToFlux(Map.class)
                .collectList()
                .block();

        if (results != null && !results.isEmpty()) {
            return extractCoords(results.get(0));
        }

        // Yritys 2: Fallback pelkällä postinumerolla jos katuosoitetta ei löydy
        log.debug("Full address geocoding failed, falling back to zipcode: {}", zipcode);

        List<Map> fallbackResults = nominatimWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam("postalcode", zipcode)
                        .queryParam("city", city)
                        .queryParam("country", "Finland")
                        .queryParam("format", "json")
                        .queryParam("limit", "1")
                        .build())
                .header("User-Agent", USER_AGENT)
                .retrieve()
                .bodyToFlux(Map.class)
                .collectList()
                .block();

        if (fallbackResults != null && !fallbackResults.isEmpty()) {
            log.info("Geocoding succeeded with zipcode fallback for {}", zipcode);
            return extractCoords(fallbackResults.get(0));
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    private double[] extractCoords(Map result) {
        try {
            double lat = Double.parseDouble((String) result.get("lat"));
            double lon = Double.parseDouble((String) result.get("lon"));
            return new double[]{lat, lon};
        } catch (Exception e) {
            log.warn("Failed to parse coordinates from Nominatim result: {}", result);
            return null;
        }
    }

    /**
     * Hakee lähipalvelut Overpass API:lla koordinaattien ympäriltä.
     *
     * Kategoriat:
     * - Ruokakaupat (supermarket, convenience)
     * - Koulut ja päiväkodit (school, kindergarten)
     * - Julkinen liikenne (bus_stop, subway_entrance, tram_stop)
     * - Liikuntapaikat (sports_centre, fitness_centre, pitch, swimming_pool)
     * - Ravintolat ja kahvilat (restaurant, cafe, fast_food)
     */
    private String fetchNearbyServices(double lat, double lon,
                                       String streetAddress, String zipcode, String city) {
        String overpassQuery = buildOverpassQuery(lat, lon);

        log.debug("Executing Overpass query for lat={}, lon={}", lat, lon);

        Map response = overpassWebClient.post()
                .uri("/api/interpreter")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .bodyValue("data=" + overpassQuery)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null) {
            return "Lähipalvelutietoja ei saatu haettua.";
        }

        return formatResults(response, streetAddress, zipcode, city);
    }

    private String buildOverpassQuery(double lat, double lon) {
        return String.format("""
                [out:json][timeout:10];
                (
                  node["shop"~"supermarket|convenience"](around:%d,%.6f,%.6f);
                  way["shop"~"supermarket|convenience"](around:%d,%.6f,%.6f);
                  node["amenity"~"school|kindergarten"](around:%d,%.6f,%.6f);
                  node["public_transport"~"stop_position|station"](around:%d,%.6f,%.6f);
                  node["highway"="bus_stop"](around:%d,%.6f,%.6f);
                  node["railway"~"subway_entrance|tram_stop"](around:%d,%.6f,%.6f);
                  node["leisure"~"sports_centre|fitness_centre|pitch|swimming_pool"](around:%d,%.6f,%.6f);
                  way["leisure"~"sports_centre|fitness_centre|pitch|swimming_pool"](around:%d,%.6f,%.6f);
                  node["amenity"~"restaurant|cafe|fast_food"](around:%d,%.6f,%.6f);
                );
                out body center;
                """,
                SEARCH_RADIUS_METERS, lat, lon,
                SEARCH_RADIUS_METERS, lat, lon,
                SEARCH_RADIUS_METERS, lat, lon,
                SEARCH_RADIUS_METERS, lat, lon,
                SEARCH_RADIUS_METERS, lat, lon,
                SEARCH_RADIUS_METERS, lat, lon,
                SEARCH_RADIUS_METERS, lat, lon,
                SEARCH_RADIUS_METERS, lat, lon,
                SEARCH_RADIUS_METERS, lat, lon
        );
    }

    @SuppressWarnings("unchecked")
    private String formatResults(Map response,
                                 String streetAddress, String zipcode, String city) {
        List<Map> elements = (List<Map>) response.get("elements");
        if (elements == null || elements.isEmpty()) {
            return String.format("Ei löydetty lähipalveluja %d metrin säteeltä osoitteesta %s.",
                    SEARCH_RADIUS_METERS, streetAddress);
        }

        // Ryhmitellään palvelut kategorioittain
        Map<String, List<String>> categories = new LinkedHashMap<>();
        categories.put("Ruokakaupat", new ArrayList<>());
        categories.put("Koulut ja päiväkodit", new ArrayList<>());
        categories.put("Julkinen liikenne", new ArrayList<>());
        categories.put("Liikuntapaikat", new ArrayList<>());
        categories.put("Ravintolat ja kahvilat", new ArrayList<>());

        for (Map element : elements) {
            Map<String, String> tags = (Map<String, String>) element.getOrDefault("tags", Map.of());
            String name = tags.getOrDefault("name", null);
            if (name == null || name.isBlank()) continue;

            String shop = tags.getOrDefault("shop", "");
            String amenity = tags.getOrDefault("amenity", "");
            String publicTransport = tags.getOrDefault("public_transport", "");
            String highway = tags.getOrDefault("highway", "");
            String railway = tags.getOrDefault("railway", "");
            String leisure = tags.getOrDefault("leisure", "");

            if (shop.matches("supermarket|convenience")) {
                categories.get("Ruokakaupat").add(name);
            } else if (amenity.matches("school|kindergarten")) {
                categories.get("Koulut ja päiväkodit").add(name);
            } else if (publicTransport.matches("stop_position|station")
                    || highway.equals("bus_stop")
                    || railway.matches("subway_entrance|tram_stop")) {
                categories.get("Julkinen liikenne").add(name);
            } else if (leisure.matches("sports_centre|fitness_centre|pitch|swimming_pool")) {
                categories.get("Liikuntapaikat").add(name);
            } else if (amenity.matches("restaurant|cafe|fast_food")) {
                categories.get("Ravintolat ja kahvilat").add(name);
            }
        }

        // Rakennetaan vastaus
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Lähipalvelut (%dm säteellä osoitteesta %s, %s %s):\n\n",
                SEARCH_RADIUS_METERS, streetAddress, zipcode, city));

        boolean anyFound = false;
        for (Map.Entry<String, List<String>> entry : categories.entrySet()) {
            List<String> items = entry.getValue().stream()
                    .distinct()
                    .limit(5)
                    .collect(Collectors.toList());

            if (!items.isEmpty()) {
                anyFound = true;
                sb.append(entry.getKey()).append(":\n");
                items.forEach(item -> sb.append("- ").append(item).append("\n"));
                sb.append("\n");
            }
        }

        if (!anyFound) {
            sb.append("Ei nimettyjä palveluja löydetty lähialueelta.");
        }

        return sb.toString();
    }
}