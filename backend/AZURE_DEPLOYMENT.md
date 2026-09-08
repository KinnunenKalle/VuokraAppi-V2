# Azure Deployment Guide

Tämä ohje kuvaa, kuinka Vuokraappi Backend deployataan Azure-ympäristöön.

## Vaadittavat Azure-resurssit

### 1. Azure Database for PostgreSQL

```bash
# Luo resource group
az group create --name vuokraappi-rg --location northeurope

# Luo PostgreSQL server
az postgres flexible-server create \
  --resource-group vuokraappi-rg \
  --name vuokraappi-db-server \
  --location northeurope \
  --admin-user vuokraappi_admin \
  --admin-password <secure-password> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14

# Luo tietokanta
az postgres flexible-server db create \
  --resource-group vuokraappi-rg \
  --server-name vuokraappi-db-server \
  --database-name vuokraappi

# Salli Azure-palveluiden yhteydet
az postgres flexible-server firewall-rule create \
  --resource-group vuokraappi-rg \
  --name vuokraappi-db-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 2. Azure App Service (Spring Boot -sovellukselle)

```bash
# Luo App Service Plan
az appservice plan create \
  --name vuokraappi-plan \
  --resource-group vuokraappi-rg \
  --sku B1 \
  --is-linux

# Luo Web App
az webapp create \
  --resource-group vuokraappi-rg \
  --plan vuokraappi-plan \
  --name vuokraappi-backend \
  --runtime "JAVA:17-java17"

# Konfiguroi ympäristömuuttujat
az webapp config appsettings set \
  --resource-group vuokraappi-rg \
  --name vuokraappi-backend \
  --settings \
    SPRING_PROFILES_ACTIVE=prod \
    AZURE_POSTGRESQL_HOST=vuokraappi-db-server.postgres.database.azure.com \
    AZURE_POSTGRESQL_DATABASE=vuokraappi \
    AZURE_POSTGRESQL_USERNAME=vuokraappi_admin \
    AZURE_POSTGRESQL_PASSWORD=<secure-password> \
    AZURE_TENANT_ID=<your-tenant-id> \
    AZURE_CLIENT_ID=<your-client-id> \
    AZURE_CLIENT_SECRET=<your-client-secret>
```

### 3. Azure Entra ID App Registration

1. Mene Azure Portaliin -> Entra ID -> App registrations -> New registration
2. Anna nimi: "Vuokraappi Backend"
3. Supported account types: "Accounts in this organizational directory only"
4. Redirect URI: Jätä tyhjäksi (ei tarvita client credentials flow:ssa)
5. Luo registraatio

#### Konfiguroi API Permissions

1. Mene App registrationiin -> API permissions
2. Lisää seuraavat Microsoft Graph -oikeudet (Application permissions):
   - `User.ReadWrite.All`
   - `Directory.ReadWrite.All`
3. Klikkaa "Grant admin consent"

#### Luo Client Secret

1. Mene App registrationiin -> Certificates & secrets
2. New client secret
3. Anna kuvaus ja valitse expiration
4. Kopioi secret-arvo (näkyy vain kerran!)

#### Kopioi tärkeät tiedot

- **Application (client) ID**: Kopioi tämä `AZURE_CLIENT_ID` -ympäristömuuttujaan
- **Directory (tenant) ID**: Kopioi tämä `AZURE_TENANT_ID` -ympäristömuuttujaan
- **Client secret**: Kopioi tämä `AZURE_CLIENT_SECRET` -ympäristömuuttujaan

### 4. Application Insights (valinnainen, suositeltu)

```bash
# Luo Application Insights
az monitor app-insights component create \
  --app vuokraappi-insights \
  --location northeurope \
  --resource-group vuokraappi-rg \
  --application-type web

# Hae instrumentation key
az monitor app-insights component show \
  --app vuokraappi-insights \
  --resource-group vuokraappi-rg \
  --query instrumentationKey -o tsv

# Lisää instrumentation key Web App:iin
az webapp config appsettings set \
  --resource-group vuokraappi-rg \
  --name vuokraappi-backend \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=<instrumentation-key>
```

## Deployment

### Maven Plugin -deployment

1. Päivitä `pom.xml` lisäämällä Azure Web App plugin:

```xml
<plugin>
    <groupId>com.microsoft.azure</groupId>
    <artifactId>azure-webapp-maven-plugin</artifactId>
    <version>2.12.0</version>
    <configuration>
        <schemaVersion>v2</schemaVersion>
        <resourceGroup>vuokraappi-rg</resourceGroup>
        <appName>vuokraappi-backend</appName>
        <region>northeurope</region>
        <runtime>
            <os>Linux</os>
            <javaVersion>Java 17</javaVersion>
            <webContainer>Java SE</webContainer>
        </runtime>
        <deployment>
            <resources>
                <resource>
                    <directory>${project.basedir}/target</directory>
                    <includes>
                        <include>*.jar</include>
                    </includes>
                </resource>
            </resources>
        </deployment>
    </configuration>
</plugin>
```

2. Buildaa ja deployaa:

```bash
mvn clean package
mvn azure-webapp:deploy
```

### Azure CLI -deployment

```bash
# Buildaa sovellus
mvn clean package

# Deployaa JAR-tiedosto
az webapp deploy \
  --resource-group vuokraappi-rg \
  --name vuokraappi-backend \
  --src-path target/vuokraappi-backend-0.0.1-SNAPSHOT.jar \
  --type jar
```

### CI/CD GitHub Actions

Luo `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Build with Maven
      run: mvn clean package -DskipTests
    
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'vuokraappi-backend'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: target/*.jar
```

## Tietokannan migraatio

### Flyway-integraatio (suositeltu)

1. Lisää Flyway-riippuvuus `pom.xml`:

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
```

2. Luo migraatiotiedostot:
   - `src/main/resources/db/migration/V1__create_users_table.sql`

3. Päivitä `application-prod.yml`:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
```

## Monitorointi

### Application Insights Queries

```kusto
// Kaikki pyynnöt viimeisen tunnin aikana
requests
| where timestamp > ago(1h)
| summarize count() by resultCode

// Hitaat pyynnöt (yli 1s)
requests
| where timestamp > ago(1h)
| where duration > 1000
| order by duration desc

// Virheet
exceptions
| where timestamp > ago(1h)
| summarize count() by type
```

### Lokit

```bash
# Katso live-logeja
az webapp log tail --resource-group vuokraappi-rg --name vuokraappi-backend

# Lataa lokit
az webapp log download --resource-group vuokraappi-rg --name vuokraappi-backend
```

## Turvallisuus

### Best Practices

1. **Salaisuudet**: Käytä Azure Key Vaultia salaisuuksien hallintaan
2. **Managed Identity**: Harkitse Managed Identityn käyttöä client secretin sijaan
3. **Network Security**: Konfiguroi VNet-integraatio ja Private Endpoints
4. **SSL/TLS**: Pakota HTTPS-yhteydet
5. **CORS**: Konfiguroi CORS-säännöt tarkasti

### Azure Key Vault -integraatio

```bash
# Luo Key Vault
az keyvault create \
  --name vuokraappi-keyvault \
  --resource-group vuokraappi-rg \
  --location northeurope

# Tallenna salaisuudet
az keyvault secret set \
  --vault-name vuokraappi-keyvault \
  --name azure-client-secret \
  --value <your-client-secret>

# Anna Web App:ille oikeudet Key Vaultiin
az webapp identity assign \
  --resource-group vuokraappi-rg \
  --name vuokraappi-backend

# Anna managed identitylle oikeudet lukea salaisuuksia
az keyvault set-policy \
  --name vuokraappi-keyvault \
  --object-id <webapp-identity-object-id> \
  --secret-permissions get list
```

## Vianmääritys

### Yleiset ongelmat

1. **Database connection failed**: Tarkista firewall-säännöt ja yhteysosoite
2. **Graph API 401**: Tarkista client credentials ja oikeudet
3. **Application won't start**: Tarkista lokit `az webapp log tail` -komennolla
4. **Memory issues**: Kasvata App Service Plan -kokoa

### Hyödyllisiä komentoja

```bash
# Restart app
az webapp restart --resource-group vuokraappi-rg --name vuokraappi-backend

# Katso konfiguraatio
az webapp config appsettings list --resource-group vuokraappi-rg --name vuokraappi-backend

# SSH-yhteys sovellukseen
az webapp ssh --resource-group vuokraappi-rg --name vuokraappi-backend
```
