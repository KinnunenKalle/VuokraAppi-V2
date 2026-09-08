package com.vuokraappi.ai;

import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.agent.tool.P;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Työkalut, joita AI-agentti voi kutsua ilmoituksen generointiprosessin aikana.
 *
 * LangChain4j tunnistaa @Tool-annotoidut metodit automaattisesti
 * ja antaa mallin kutsua niitä tarpeen mukaan.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ListingTools {

    private final SimilarApartmentsTool similarApartmentsTool;
    private final StatisticsFinlandTool statisticsFinlandTool;
    private final NeighborhoodTool neighborhoodTool;

    @Tool("Hae vastaavien vuokra-asuntojen hintatiedot samalta postinumeroalueelta. " +
          "Käytä tätä vuokratason vertailuun.")
    public String searchSimilarApartments(
            @P("Postinumero") String zipcode,
            @P("Huoneluku") int rooms,
            @P("Minimikoko neliömetreinä") double minSize,
            @P("Maksimikoko neliömetreinä") double maxSize
    ) {
        log.info("Agent calling searchSimilarApartments: zipcode={}, rooms={}", zipcode, rooms);
        return similarApartmentsTool.search(zipcode, rooms, minSize, maxSize);
    }

    @Tool("Hae Tilastokeskuksen viralliset vuokratilastot postinumeroalueelta. " +
          "Palauttaa mediaanivuokran ja neliövuokran tilastot.")
    public String fetchStatisticsFinland(
            @P("Postinumero") String zipcode
    ) {
        log.info("Agent calling fetchStatisticsFinland: zipcode={}", zipcode);
        return statisticsFinlandTool.fetch(zipcode);
    }

    @Tool("Hae tietoja kaupunginosasta ja lähimmistä palveluista katuosoitteen perusteella. " +
          "Palauttaa lähikaupat, koulut, pysäkit ja muut palvelut.")
    public String fetchNeighborhoodInfo(
            @P("Postinumero") String zipcode,
            @P("Kaupunki") String city,
            @P("Katuosoite") String streetAddress
    ) {
        log.info("Agent calling fetchNeighborhoodInfo: zipcode={}, city={}, streetAddress={}",
                zipcode, city, streetAddress);
        return neighborhoodTool.fetch(zipcode, city, streetAddress);
    }
}