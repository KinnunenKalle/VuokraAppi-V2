# Docker-tiedostojen yhteenveto

## Luodut tiedostot

### 1. **Dockerfile**
- Multi-stage build: Maven build + JRE runtime
- Optimoitu koko (Alpine-pohjainen)
- Turvallisuus: ei-root käyttäjä
- Health check sisäänrakennettu
- Java 17 + Spring Boot 3.2.2

### 2. **docker-compose.yml** (Tuotanto)
- PostgreSQL 15
- Spring Boot -sovellus (buildattu image)
- pgAdmin (valinnainen, --profile tools)
- Tietokanta-healthcheck
- Persistent volumes
- Network isolation

### 3. **docker-compose-dev.yml** (Kehitys)
- PostgreSQL 15
- Maven development container
- Volume mount lähdekoodille (hot reload)
- Debug-portti 5005 (remote debugging)
- Maven cache volume (nopeutus)
- Spring Boot DevTools -tuki

### 4. **.dockerignore**
- Poissulkee tarpeettomat tiedostot buildista
- Pienentää build contextia
- Nopeuttaa buildia

### 5. **.env**
- Lokaali konfiguraatio
- Azure AD -asetukset
- PostgreSQL-asetukset
- **HUOM: Älä commitoi Gitiin!**

### 6. **DOCKER_README.md**
- Kattava käyttöohje suomeksi
- Pika-aloitus
- Yleisimmät komennot
- Ongelmatilanteiden ratkaisu
- Tietokannan hallinta
- Debug-ohjeet

### 7. **docker-start.sh** (Linux/Mac)
- Interaktiivinen käynnistysskripti
- Valinta tuotanto/kehitys -moodin välillä
- Automaattinen .env-tiedoston luonti

### 8. **docker-start.bat** (Windows)
- Windows-versio käynnistysskriptistä
- Samat ominaisuudet kuin .sh-versio

---

## Pika-aloitus

### Helpoin tapa (käyttäen skriptejä):

**Linux/Mac:**
```bash
./docker-start.sh
```

**Windows:**
```cmd
docker-start.bat
```

### Manuaalinen käynnistys:

**Tuotanto-build:**
```bash
docker-compose up --build
```

**Kehitys-build (hot reload):**
```bash
docker-compose -f docker-compose-dev.yml up --build
```

---

## Portit

- **8080**: Spring Boot backend
- **5432**: PostgreSQL
- **5050**: pgAdmin (käynnistyy vain `--profile tools` kanssa)
- **5005**: Debug-portti (vain dev-moodissa)

---

## Tärkeimmät erot: Tuotanto vs. Kehitys

| Ominaisuus | Tuotanto (docker-compose.yml) | Kehitys (docker-compose-dev.yml) |
|------------|-------------------------------|----------------------------------|
| Image | Buildattu JAR | Maven live |
| Lähdekoodin muutokset | Vaatii rebuildin | Hot reload |
| Debug-portti | Ei | Kyllä (5005) |
| Käynnistysaika | Nopea | Hitaampi (Maven build) |
| Koko | Pieni (~150MB) | Suuri (~500MB) |
| Käyttötarkoitus | Testing, staging | Active development |

---

## Azure AD -testaus

Jos haluat testata Azure AD -integraatiota:

1. Luo App Registration Azure Portalissa
2. Päivitä `.env`:
   ```env
   AZURE_TENANT_ID=your-tenant-id
   AZURE_CLIENT_ID=your-client-id
   AZURE_CLIENT_SECRET=your-client-secret
   ```
3. Käynnistä uudelleen: `docker-compose restart app`

---

## Seuraavat askeleet

1. **Kokeile sovellusta**: http://localhost:8080
2. **Tarkastele tietokantaa**: Käytä pgAdmin (port 5050) tai psql
3. **Testaa API-endpointit**: Käytä Postman, curl tai selainlaajennusta
4. **Kehitä sovellusta**: Käytä dev-moodia ja remote debuggingia

---

## Vinkkejä

### Maven-riippuvuuksien päivitys
Jos päivität `pom.xml`:
```bash
docker-compose down
docker-compose up --build
```

### Tietokannan tyhjennys
```bash
docker-compose down -v  # Poistaa myös datan!
docker-compose up
```

### Logien seuranta
```bash
docker-compose logs -f app
```

### Konttiin kirjautuminen
```bash
docker-compose exec app sh
```

---

## Tuki

Lue lisää: **DOCKER_README.md**
