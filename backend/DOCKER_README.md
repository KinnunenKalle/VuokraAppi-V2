# Docker-ohjeet - Vuokraappi Backend

## 📋 Sisällysluettelo
- [Esivalmistelut](#esivalmistelut)
- [Pika-aloitus](#pika-aloitus)
- [Kehitysympäristö](#kehitysympäristö)
- [Tuotanto-build](#tuotanto-build)
- [Tietokannan hallinta](#tietokannan-hallinta)
- [Yleisimmät komennot](#yleisimmät-komennot)
- [Ongelmatilanteet](#ongelmatilanteet)

---

## 🔧 Esivalmistelut

### Vaatimukset
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (versio 20.10 tai uudempi)
- 4GB vapaata muistia
- 10GB vapaata levytilaa

### Tarkista asennus
```bash
docker --version
docker-compose --version
```

---

## 🚀 Pika-aloitus

### 1. Kloonaa tai pura projekti
```bash
cd vuokraappi-backend
```

### 2. Luo .env-tiedosto (jos ei ole jo olemassa)
```bash
# .env-tiedosto on jo luotu, voit muokata sitä:
nano .env
```

### 3. Käynnistä koko stack
```bash
docker-compose up
```

Tai käynnistä taustalla:
```bash
docker-compose up -d
```

### 4. Testaa sovellus
- **Backend API**: http://localhost:8080
- **PostgreSQL**: localhost:5432
- **Terveystarkistus**: http://localhost:8080/actuator/health (jos actuator on käytössä)

---

## 💻 Kehitysympäristö

Käytä `docker-compose-dev.yml`-tiedostoa kehityksessä. Se tarjoaa:
- 📦 Volume mount lähdekoodille (muutokset näkyvät heti)
- 🐛 Debug-portti (5005) etädebuggausta varten
- 🔄 Hot reload Spring Boot DevTools:n kanssa

### Käynnistä kehitysympäristö
```bash
docker-compose -f docker-compose-dev.yml up
```

### Remote debugging (IntelliJ IDEA)
1. Run → Edit Configurations
2. Add New Configuration → Remote JVM Debug
3. Host: `localhost`, Port: `5005`
4. Käynnistä debug-sessio

### Remote debugging (VS Code)
Lisää `.vscode/launch.json`:
```json
{
  "type": "java",
  "name": "Attach to Docker",
  "request": "attach",
  "hostName": "localhost",
  "port": 5005
}
```

---

## 🏗️ Tuotanto-build

Tuotanto-optimoitu build (käyttää multi-stage Dockerfilea):

```bash
# Buildaa image
docker build -t vuokraappi-backend:latest .

# Aja kontti
docker run -d \
  --name vuokraappi-backend \
  -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://your-db-host:5432/vuokraappi \
  -e SPRING_DATASOURCE_USERNAME=your-username \
  -e SPRING_DATASOURCE_PASSWORD=your-password \
  vuokraappi-backend:latest
```

---

## 🗄️ Tietokannan hallinta

### Yhdistä PostgreSQL:ään
```bash
# docker-compose sisällä
docker-compose exec postgres psql -U postgres -d vuokraappi

# tai ulkopuolelta
psql -h localhost -p 5432 -U postgres -d vuokraappi
```

### Yleiset SQL-komennot
```sql
-- Listaa taulut
\dt

-- Näytä käyttäjät
SELECT * FROM users;

-- Tyhjennä taulu
TRUNCATE TABLE users CASCADE;

-- Poistu
\q
```

### pgAdmin (Graafinen käyttöliittymä)
Käynnistä pgAdmin:
```bash
docker-compose --profile tools up -d pgadmin
```

Avaa selaimessa: http://localhost:5050
- Email: `admin@vuokraappi.com`
- Password: `admin`

**Yhdistä tietokantaan:**
1. Add New Server
2. Name: `Vuokraappi Local`
3. Connection:
   - Host: `postgres` (kontin nimi)
   - Port: `5432`
   - Database: `vuokraappi`
   - Username: `postgres`
   - Password: `postgres`

### Backup ja restore
```bash
# Tee backup
docker-compose exec postgres pg_dump -U postgres vuokraappi > backup.sql

# Palauta backup
docker-compose exec -T postgres psql -U postgres vuokraappi < backup.sql
```

---

## 🎯 Yleisimmät komennot

### Käynnistys ja pysäytys
```bash
# Käynnistä
docker-compose up

# Käynnistä taustalla
docker-compose up -d

# Pysäytä
docker-compose down

# Pysäytä ja poista volumet (kaikki data häviää!)
docker-compose down -v
```

### Logien seuranta
```bash
# Kaikki servicet
docker-compose logs -f

# Vain backend
docker-compose logs -f app

# Vain tietokanta
docker-compose logs -f postgres

# Viimeiset 100 riviä
docker-compose logs --tail=100 app
```

### Uudelleenbyggäys
```bash
# Buildaa uudelleen (esim. pom.xml muuttunut)
docker-compose up --build

# Pakota clean build
docker-compose build --no-cache
```

### Suorita komentoja containerissa
```bash
# Backend-kontin shell
docker-compose exec app sh

# Maven-komennot
docker-compose exec app mvn test
docker-compose exec app mvn clean package

# PostgreSQL shell
docker-compose exec postgres bash
```

### Resurssien tarkastelu
```bash
# Näytä käynnissä olevat kontit
docker-compose ps

# Näytä resurssienkäyttö
docker stats

# Näytä volumet
docker volume ls

# Näytä imaget
docker images
```

---

## 🔧 Ongelmatilanteet

### Portti jo käytössä
**Ongelma**: `Bind for 0.0.0.0:8080 failed: port is already allocated`

**Ratkaisu**: Vaihda portti `docker-compose.yml`:ssä:
```yaml
ports:
  - "8081:8080"  # Käytä porttia 8081
```

### Tietokanta ei käynnisty
**Ongelma**: `postgres exited with code 1`

**Ratkaisu**:
```bash
# Poista vanha volume
docker-compose down -v

# Käynnistä uudelleen
docker-compose up
```

### Build epäonnistuu
**Ongelma**: `Failed to execute goal...`

**Ratkaisu**:
```bash
# Tyhjennä Maven cache
docker-compose down
docker volume rm vuokraappi-backend_maven_cache

# Buildaa uudelleen
docker-compose up --build
```

### Out of memory
**Ongelma**: Sovellus kaatuu muistin loppuessa

**Ratkaisu**: Lisää `docker-compose.yml`:ssä:
```yaml
app:
  deploy:
    resources:
      limits:
        memory: 2G
```

### Yhteysongelmat tietokantaan
**Ongelma**: `Connection refused` tai `Unknown host`

**Ratkaisu**:
1. Varmista että tietokanta on käynnissä: `docker-compose ps`
2. Tarkista network: `docker network ls`
3. Odota hetki - tietokanta saattaa olla vielä käynnistymässä
4. Tarkista logeista: `docker-compose logs postgres`

### Puhdista kaikki Docker-resurssit
```bash
# VAROITUS: Poistaa KAIKKI Docker-resurssit (myös muiden projektien!)
docker system prune -a --volumes

# Turvallisempi: Poista vain tämän projektin resurssit
docker-compose down -v --rmi all
```

---

## 📚 Lisätietoja

### Azure AD -integraatio lokaalisti
Jos haluat testata Azure AD -integraatiota lokaalisti:

1. Luo Azure AD -sovellus [Azure Portalissa](https://portal.azure.com)
2. Päivitä `.env`-tiedosto:
   ```env
   AZURE_TENANT_ID=your-actual-tenant-id
   AZURE_CLIENT_ID=your-actual-client-id
   AZURE_CLIENT_SECRET=your-actual-client-secret
   ```
3. Käynnistä uudelleen: `docker-compose restart app`

### Production deployment
Tuotantokäyttöön suositelluissa ympäristöissä:
- Käytä hallittuja tietokantapalveluita (esim. Azure Database for PostgreSQL)
- Älä käytä `docker-compose` tuotannossa
- Käytä Kubernetes, Azure Container Apps tai vastaavaa
- Lue lisää: `AZURE_DEPLOYMENT.md`

---

## 🆘 Tuki

Jos kohtaat ongelmia:
1. Tarkista lokit: `docker-compose logs`
2. Varmista että Docker Desktop on käynnissä
3. Tarkista `.env`-tiedoston asetukset
4. Kokeile puhtaalta pöydältä: `docker-compose down -v && docker-compose up --build`

---

## 📝 Muistiinpanoja

### Tiedostorakenne
```
vuokraappi-backend/
├── Dockerfile                    # Tuotanto-image
├── docker-compose.yml            # Perus setup
├── docker-compose-dev.yml        # Kehityssetup hot reload:lla
├── .dockerignore                 # Tiedostot joita ei kopioida imageen
├── .env                          # Lokaali konfiguraatio (EI GITIIN!)
├── .env.example                  # Esimerkki environment-tiedosto
└── DOCKER_README.md              # Tämä tiedosto
```

### Dockerin versiot
- **docker-compose.yml**: Tuotantomainen, optimoitu image
- **docker-compose-dev.yml**: Kehitys, volume mounts, debug-portti

Valitse käyttötarkoituksen mukaan!
