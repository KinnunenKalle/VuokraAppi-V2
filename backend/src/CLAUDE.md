# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build & Run

```bash
# Build (with tests)
mvn clean install

# Build (skip tests)
mvn clean package -DskipTests

# Run locally (PostgreSQL on localhost)
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Run with Docker (dev, hot-reload, debug port 5005)
docker-compose -f docker-compose-dev.yml up --build

# Run with Docker (production-like)
docker-compose up --build
```

### Testing

```bash
# Run all tests
mvn test

# Run a single test class
mvn test -Dtest=MyServiceTest

# Run a single test method
mvn test -Dtest=MyServiceTest#myMethod
```

Tests use H2 in-memory database. There are currently no tests in the project.

### Deploy to Azure

```bash
mvn azure-webapp:deploy
```

## Architecture

Spring Boot 3.2 / Java 17 REST API for a Finnish rental apartment platform. Follows standard layered architecture:

```
Controller → Service → Repository → JPA Entity → Database
```

**Profiles:**
- `local`: PostgreSQL on localhost, verbose SQL logging, no JWT auth
- `dev`: Azure PostgreSQL, JWT auth enabled, Graph API integration
- `prod`: Azure SQL Server, Application Insights, minimal logging

JWT authentication (`JwtAuthFilter`) is only active in `dev` and `prod` profiles. Local development skips auth entirely.

## Key Packages (`src/main/java/com/vuokraappi/`)

| Package | Role |
|---|---|
| `controller/` | REST endpoints under `/v1/` |
| `service/` | Business logic |
| `repository/` | Spring Data JPA repositories |
| `entity/` | JPA entities (User, Tenant, Landlord, Apartment, ApartmentImage) |
| `dto/` | Request/response DTOs |
| `config/` | Security, OAuth2, AI models, Azure Blob Storage config |
| `ai/` | LangChain4j AI agents for listing generation |
| `exception/` | Custom exceptions + global `@ControllerAdvice` handler |

## Data Model

Users have a role (`TENANT` or `LANDLORD`). A `User` record is paired with either a `Tenant` or `Landlord` record (cascade deleted). `Landlord` owns `Apartment` records; `Apartment` has `ApartmentImage` records stored in Azure Blob Storage.

Database schema is initialized from `src/main/resources/schema.sql` on startup. UUIDs are used as primary keys for users.

## External Integrations

- **Microsoft Entra ID / Graph API** (`GraphApiService`): User identity, role assignment, deletion — used in dev/prod only.
- **Azure Blob Storage** (`BlobStorageService`): Apartment image upload and SAS URL generation.
- **LangChain4j + OpenAI** (`ai/` package): AI-powered rental listing generation via `/v1/listings/generate`.
- **OpenStreetMap** (Nominatim/Overpass): Geocoding and nearby services discovery used in listing generation tools.
- **Statistics Finland** (stat.fi): Regional statistics enrichment for listings.

## Required Environment Variables

```
SPRING_PROFILES_ACTIVE
AZURE_TENANT_ID
AZURE_CLIENT_ID
AZURE_CLIENT_SECRET
AZURE_POSTGRESQL_HOST / AZURE_POSTGRESQL_USERNAME / AZURE_POSTGRESQL_PASSWORD  # dev/prod
AZURE_STORAGE_CONNECTION_STRING
OPENAI_API_KEY
APPINSIGHTS_INSTRUMENTATIONKEY  # prod only
```

## API Reference

A comprehensive OpenAPI spec is at `openapi.yaml` in the project root. Swagger UI is available at `http://localhost:8080/swagger-ui.html` when running locally.
