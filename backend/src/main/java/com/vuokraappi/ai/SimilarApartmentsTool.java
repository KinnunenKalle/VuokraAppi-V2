package com.vuokraappi.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Hakee vastaavien asuntojen hintatiedot.
 *
 * TODO: Toteuta oikea haku kun Apartment-entiteetti ja -repository ovat valmiit.
 * Tällä hetkellä palauttaa stub-datan kehitystä varten.
 */
@Component
@Slf4j
public class SimilarApartmentsTool {

    public String search(String postalCode, int rooms, double minSize, double maxSize) {
        log.info("Searching similar apartments: postalCode={}, rooms={}, size={}-{}",
                postalCode, rooms, minSize, maxSize);

        // TODO: Korvaa oikealla kyselyllä, esim:
        // return apartmentRepository
        //     .findSimilar(postalCode, rooms, minSize, maxSize)
        //     .stream()
        //     .map(a -> String.format("%s m², %d h, %.0f€/kk", a.getSize(), a.getRooms(), a.getRent()))
        //     .collect(Collectors.joining("\n"));

        // Stub-data kehitystä varten
        return String.format("""
                Löydettiin 3 vastaavaa asuntoa postinumeroalueelta %s:
                - %d h + k, %.0f m², 900 €/kk
                - %d h + k, %.0f m², 950 €/kk
                - %d h + k, %.0f m², 875 €/kk
                """, postalCode, rooms, minSize + 5, rooms, minSize, rooms, maxSize - 5);
    }
}