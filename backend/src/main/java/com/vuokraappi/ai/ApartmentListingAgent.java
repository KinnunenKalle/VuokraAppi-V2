package com.vuokraappi.ai;

import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

/**
 * AI-agentti asuntoilmoitusten generointiin.
 *
 * LangChain4j luo tästä interfacesta automaattisesti toteutuksen,
 * joka hoitaa tool call -silmukan mallin kanssa.
 *
 * @see AiServices
 */
public interface ApartmentListingAgent {

    @SystemMessage("""
            Olet asiantunteva kiinteistövälittäjä Suomessa. Tehtäväsi on auttaa
            vuokranantajia luomaan houkuttelevia vuokrailmoituksia ja arvioimaan
            sopivaa vuokratasoa.

            Käytä aina käytettävissä olevia työkaluja kerätäksesi tietoa:
            - Hae vastaavien asuntojen vuokratiedot vertailua varten
            - Hae Tilastokeskuksen tilastot postinumeroalueelta
            - Hae kaupunginosa- ja palvelutiedot sijainnin perusteella

            Kirjoita ilmoitusteksti suomeksi, ammattimaisesti mutta lämpimästi.
            Perustele vuokrasuositus aina datalla.
            """)
    @UserMessage("""
            Luo vuokrailmoitus seuraavilla tiedoilla:

            Postinumero: {{zipcode}}
            Kaupunki: {{city}}
            Katuosoite: {{streetAddress}}
            Huoneluku: {{rooms}}
            Pinta-ala: {{size}} m²
            Kerros: {{floor}}
            Rakennusvuosi: {{buildYear}}
            Lisätiedot: {{additionalInfo}}

            Hae lähipalvelut katuosoitteen ja postinumeron perusteella mahdollisimman tarkasti.

            Palauta vastaus JSON-muodossa:
            {
              "listingText": "...",
              "rentSuggestion": {
                "min": 000,
                "max": 000,
                "recommended": 000,
                "reasoning": "..."
              }
            }
            """)
    String generateListing(
            @V("zipcode") String zipcode,
            @V("city") String city,
            @V("streetAddress") String streetAddress,
            @V("rooms") int rooms,
            @V("size") double size,
            @V("floor") int floor,
            @V("buildYear") int buildYear,
            @V("additionalInfo") String additionalInfo
    );
}