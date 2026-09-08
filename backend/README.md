# Vuokraappi Backend

Spring Boot -sovellus vuokraappi-mobiilisovelluksen backend-palvelua varten. Integroituu Azure Entra ID:hen (entinen Azure AD) ja Microsoft Graph API:in.

## Teknologiat

- Java 17
- Spring Boot 3.2.2
- Spring Data JPA
- PostgreSQL / Azure Database for PostgreSQL
- Microsoft Graph API
- Azure Entra ID
- Maven
- Lombok

## Arkkitehtuuri

Sovellus käyttää kerrosarkkitehtuuria:
- **Controller Layer**: REST API -päätepisteet
- **Service Layer**: Liiketoimintalogiikka
- **Repository Layer**: Tietokantaoperaatiot
- **Entity Layer**: JPA-entiteetit
- **Integration Layer**: Microsoft Graph API -integraatio

## Ympäristökohtaiset konfiguraatiot

Sovelluksessa on kolme ympäristöprofiilia:

### Local (application-local.yml)
- Paikallinen PostgreSQL-tietokanta
- Kehitystyöhön tarkoitettu
- Verbose logging

### Dev (application-dev.yml)
- Azure Database for PostgreSQL
- Kehitysympäristö Azuressa
- Ympäristömuuttujat tietokantayhteyksille
- Info-tason logging

### Prod (application-prod.yml)
- Azure Database for PostgreSQL
- Tuotantoympäristö
- Optimoidut yhteyspoolin asetukset
- Minimaalinen logging
- Application Insights -integraatio

## Käyttäjärekisteröinti

### Toimintalogiikka

1. Mobiilisovellus rekisteröi käyttäjän Azure Entra ID:hen
2. Mobiilisovellus lähettää käyttäjän UUID:n ja valitun roolin backend-palveluun
3. Backend tarkistaa, että käyttäjä on olemassa Azure AD:ssä
4. Backend päivittää roolin Azure AD:hen Microsoft Graph API:n kautta
5. Backend tallentaa käyttäjätiedot omaan tietokantaansa
6. Backend palauttaa vahvistuksen

### Endpoint

```
POST /users
```

### Request Body

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "tenant"
}
```

**Parametrit:**
- `id` (UUID, required): Käyttäjän UUID Azure Entrasta
- `role` (String, required): Käyttäjän rooli, joko "tenant" tai "landlord" (case-insensitive)

### Onnistunut vastaus (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "TENANT",
  "created_at": "2024-02-02T10:30:00",
  "is_active": true
}
```

### Virhetilanteet

**400 Bad Request** - Validointivirhe:
```json
{
  "status": 400,
  "message": "Validation failed",
  "timestamp": "2024-02-02T10:30:00",
  "errors": {
    "id": "User ID is required",
    "role": "Role must be either 'tenant' or 'landlord'"
  }
}
```

**409 Conflict** - Käyttäjä on jo rekisteröity:
```json
{
  "status": 409,
  "message": "User with ID 550e8400-e29b-41d4-a716-446655440000 already exists",
  "timestamp": "2024-02-02T10:30:00"
}
```

**502 Bad Gateway** - Azure AD / Graph API -virhe:
```json
{
  "status": 502,
  "message": "Failed to communicate with Azure AD: User with ID ... does not exist in Azure AD",
  "timestamp": "2024-02-02T10:30:00"
}
```

**500 Internal Server Error** - Odottamaton virhe:
```json
{
  "status": 500,
  "message": "An unexpected error occurred",
  "timestamp": "2024-02-02T10:30:00"
}
```

## Käyttöönotto

### Esivaatimukset

- Java 17 tai uudempi
- Maven 3.6+
- PostgreSQL 12+ (paikalliseen kehitykseen)
- Azure-tili ja Entra ID -konfiguraatio

### Azure Entra ID -konfigurointi

1. Luo App Registration Azure Portalissa
2. Lisää API-oikeudet:
   - `User.ReadWrite.All` (Application permission)
   - `Directory.ReadWrite.All` (Application permission)
3. Myönnä admin consent oikeuksille
4. Kopioi:
   - Tenant ID
   - Client ID
   - Client Secret

### Paikallinen kehitys

1. Luo PostgreSQL-tietokanta:
```sql
CREATE DATABASE vuokraappi;
```

2. Kopioi ja muokkaa `application-local.yml`:
```yaml
spring:
  datasource:
    password: your_local_password

azure:
  activedirectory:
    tenant-id: your-tenant-id
    client-id: your-client-id
    client-secret: your-client-secret
```

3. Käynnistä sovellus local-profiililla:
```bash
mvn clean install
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Azure-kehitysympäristö

Aseta ympäristömuuttujat:
```bash
export SPRING_PROFILES_ACTIVE=dev
export AZURE_POSTGRESQL_HOST=your-server.postgres.database.azure.com
export AZURE_POSTGRESQL_DATABASE=vuokraappi
export AZURE_POSTGRESQL_USERNAME=your-username
export AZURE_POSTGRESQL_PASSWORD=your-password
export AZURE_TENANT_ID=your-tenant-id
export AZURE_CLIENT_ID=your-client-id
export AZURE_CLIENT_SECRET=your-client-secret
```

Käynnistä:
```bash
mvn spring-boot:run
```

### Tuotantoympäristö

Konfiguroi samat ympäristömuuttujat kuin dev-ympäristössä plus:
```bash
export SPRING_PROFILES_ACTIVE=prod
export APPINSIGHTS_INSTRUMENTATIONKEY=your-instrumentation-key
```

## Testaus

### cURL-esimerkki

```bash
curl -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "role": "tenant"
  }'
```

## Tietokantarakenne

### users-taulu

| Sarake | Tyyppi | Kuvaus |
|--------|--------|--------|
| id | UUID | Käyttäjän tunniste (PK) |
| role | VARCHAR(20) | Käyttäjän rooli (TENANT/LANDLORD) |
| created_at | TIMESTAMP | Luomisaika |
| updated_at | TIMESTAMP | Päivitysaika |
| is_active | BOOLEAN | Onko käyttäjä aktiivinen |

## Microsoft Graph API -integraatio

### Käytettävät endpointit

- **Token endpoint**: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
  - Hakee access tokenin client credentials flow:lla
  
- **User endpoint**: `https://graph.microsoft.com/v1.0/users/{user-id}`
  - Varmistaa käyttäjän olemassaolon
  - Päivittää käyttäjän roolin extension attributeina

### Roolin tallennus Azure AD:ssä

Käyttäjän rooli tallennetaan Azure AD:ssä `onPremisesExtensionAttributes.extensionAttribute1` -kenttään. 

Vaihtoehtoisesti voidaan käyttää custom extension attributeja, jolloin kentän nimi on muotoa:
```
extension_{appId}_role
```

## Tulevat ominaisuudet

- Azure AD -autentikoinnin integrointi (Bearer token -validointi)
- Lisää käyttäjäoperaatioita (haku, päivitys, poisto)
- Vuokra-asuntojen hallinta
- Vuokrasopimusten hallinta
- Maksutietojen käsittely

## Tietoturva

- Azure AD -autentikointi
- Salasanat ja tokenit ympäristömuuttujissa
- SSL-yhteydet tietokantaan tuotannossa
- HTTPS API-kutsuihin
- Application Insights -monitorointi
