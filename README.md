# CargoEz Backend

Node.js microservices monorepo with PostgreSQL, Clean Architecture, Keycloak authentication, and publishable shared packages.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js >= 18.7.0 | Runtime |
| TypeScript 5.x | Language |
| Express 4 | HTTP framework |
| PostgreSQL 16 | Database |
| Knex.js | Query builder & migrations |
| Keycloak 26.x | Identity & access management (OAuth 2.0 / OIDC) |
| Zod | Request validation |
| Pino | Structured logging |
| Swagger UI | API documentation |

---

## Project Structure

```
BACKEND/
├── packages/                        # Publishable npm packages (@rajkumarganesan93/*)
│   ├── domain/                      # Core types: BaseEntity, IRepository, pagination
│   ├── application/                 # Mapper, audit service, Pino logger
│   ├── api/                         # MessageCode, MessageCatalog, response builders
│   ├── shared/                      # DB config, async handler, pagination parser
│   ├── infrastructure/              # App factory, middleware, errors, auth, Swagger, validation
│   └── integrations/                # Email & notification interfaces + stubs
├── services/
│   ├── user-service/                # User CRUD (port 3001, DB: user_service_db)
│   ├── shared-db-example/           # Country CRUD (port 3005, DB: master_db)
│   └── api-portal/                  # Combined Swagger UI (port 4000)
├── keycloak/
│   └── cargoez-realm.json           # Keycloak realm config (clients, users, roles)
├── DEVELOPMENT.md                   # Full development guide & coding conventions
├── PACKAGES.md                      # Package reference with exports & usage
├── AUTHENTICATION.md                # Keycloak setup, OAuth/PKCE, token management
├── ERROR_CODES.md                   # Message codes & error response reference
└── package.json                     # npm workspaces root
```

---

## How to Run

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | >= 18.7.0 | `node -v` to check |
| npm | >= 9 | Comes with Node.js |
| PostgreSQL | 16+ | Running on `localhost:5432` |
| Keycloak | 26.x | For API authentication (optional for unauthenticated dev) |

### Step 1 — Install dependencies

```bash
npm install
```

This installs all workspace dependencies (packages + services) in a single command.

### Step 2 — Create databases

Connect to PostgreSQL and create the required databases:

```sql
CREATE DATABASE user_service_db;
CREATE DATABASE master_db;
```

### Step 3 — Configure environment variables

Each service needs a `.env` file in its root directory. Create them from this template:

**`services/user-service/.env`**

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=user_service_db
PORT=3001

# Keycloak (remove these lines to run without authentication)
KEYCLOAK_ISSUER=http://localhost:8080/realms/cargoez
KEYCLOAK_AUDIENCE=cargoez-api
```

**`services/shared-db-example/.env`**

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=master_db
PORT=3005

# Keycloak (remove these lines to run without authentication)
KEYCLOAK_ISSUER=http://localhost:8080/realms/cargoez
KEYCLOAK_AUDIENCE=cargoez-api
```

> **Tip:** When `KEYCLOAK_ISSUER` and `KEYCLOAK_AUDIENCE` are present, JWT authentication is enabled automatically. Remove them to run services without auth during early development.

### Step 4 — Build everything

```bash
npm run build
```

This builds all 6 packages (in dependency order) and all 3 services.

### Step 5 — Run database migrations

```bash
npm run migrate:all
```

This creates all required tables in both databases.

### Step 6 — Start Keycloak (if using authentication)

**Option A — Standalone (Java/OpenJDK 21)**

```bash
# Download Keycloak from https://www.keycloak.org/downloads
# Extract and copy the realm config:
copy keycloak\cargoez-realm.json <keycloak-dir>\data\import\cargoez-realm.json

# Start with realm import:
<keycloak-dir>\bin\kc.bat start-dev --import-realm
```

**Option B — Docker**

```bash
docker run -d --name keycloak \
  -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -v ./keycloak/cargoez-realm.json:/opt/keycloak/data/import/cargoez-realm.json \
  quay.io/keycloak/keycloak:26.1.0 start-dev --import-realm
```

Keycloak will be available at `http://localhost:8080`.

| Credential | Username | Password | Purpose |
|---|---|---|---|
| Admin Console | `admin` | `admin` | Keycloak admin UI at `/admin` |
| API User (admin role) | `admin` | `admin123` | For API token acquisition |
| API User (user role) | `testuser` | `test123` | For API token acquisition |
| API User (manager role) | `manager` | `manager123` | For API token acquisition |

### Step 7 — Start all services

Open three terminals and run:

```bash
# Terminal 1 — User Service
node services/user-service/dist/src/index.js

# Terminal 2 — Shared DB Example
node services/shared-db-example/dist/src/index.js

# Terminal 3 — API Portal (combined Swagger)
node services/api-portal/dist/src/index.js
```

Or for development with hot-reload:

```bash
# Terminal 1
npm run dev -w @cargoez-be/user-service

# Terminal 2
npm run dev -w @cargoez-be/shared-db-example

# Terminal 3
npm run dev:portal
```

### Step 8 — Verify everything is running

| Service | URL | What it does |
|---|---|---|
| User Service — Health | http://localhost:3001/health | Health check |
| User Service — Swagger | http://localhost:3001/api-docs | API docs for user endpoints |
| Shared DB Example — Health | http://localhost:3005/health | Health check |
| Shared DB Example — Swagger | http://localhost:3005/api-docs | API docs for country endpoints |
| **API Portal** | **http://localhost:4000** | **Combined Swagger UI for all services** |
| Keycloak | http://localhost:8080 | Identity provider admin console |

---

## API Portal (Combined Swagger)

The API Portal at `http://localhost:4000` provides a single Swagger UI that aggregates all microservices. Use the dropdown at the top-right to switch between services.

```
┌──────────────────────────────────────────┐
│           API Portal (:4000)             │
│  ┌──────────────────────────────────┐    │
│  │  Select a spec: [User Service ▼] │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Fetches OpenAPI specs from:             │
│    → localhost:3001/api-docs/json         │
│    → localhost:3005/api-docs/json         │
│                                          │
│  Supports "Authorize" button for         │
│  Bearer token authentication             │
└──────────────────────────────────────────┘
```

To add a new service to the portal, update the `SERVICE_URLS` array in `services/api-portal/src/index.ts`.

---

## Authentication & Authorization

All APIs are protected with **JWT Bearer tokens** via **Keycloak** (OAuth 2.0 / OpenID Connect).

### Getting a Token (Postman / curl)

```bash
curl -X POST http://localhost:8080/realms/cargoez/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=cargoez-api&username=admin&password=admin123"
```

PowerShell:

```powershell
$body = "grant_type=password&client_id=cargoez-api&username=admin&password=admin123"
$response = Invoke-RestMethod -Uri "http://localhost:8080/realms/cargoez/protocol/openid-connect/token" -Method POST -ContentType "application/x-www-form-urlencoded" -Body $body
$response.access_token
```

### Using the Token

Add the token as a `Bearer` header to API requests:

```bash
curl http://localhost:3001/users -H "Authorization: Bearer <your_token>"
```

In Swagger UI, click the **Authorize** button and paste: `Bearer <your_token>`

### Role-Based Access Control

Routes are protected by roles. The `authorize()` middleware checks JWT realm roles:

| Operation | Required Role | Example Route |
|---|---|---|
| Read (GET) | Any authenticated user | `GET /users`, `GET /countries` |
| Create (POST) | `admin` | `POST /users`, `POST /countries` |
| Update (PUT) | `admin` or `manager` | `PUT /users/:id`, `PUT /countries/:id` |
| Delete (DELETE) | `admin` | `DELETE /users/:id`, `DELETE /countries/:id` |

### Keycloak Clients

| Client ID | Type | Grant Type | Purpose |
|---|---|---|---|
| `cargoez-api` | Public | Password (ROPC) | Postman / API testing |
| `cargoez-web` | Public | Auth Code + PKCE | Frontend web applications |
| `cargoez-mobile` | Public | Auth Code + PKCE | Mobile apps (React Native, Flutter) |
| `cargoez-service` | Confidential | Client Credentials | Service-to-service communication |

> See [AUTHENTICATION.md](AUTHENTICATION.md) for the full guide: PKCE setup, Postman pre-request scripts, frontend/mobile integration code, token refresh, and troubleshooting.

---

## Packages

All 6 packages are published to [GitHub Packages](https://github.com/rajkumarganesan93/cargoez2-backend/packages) under the `@rajkumarganesan93` scope.

| Package | Version | Purpose |
|---|---|---|
| `@rajkumarganesan93/domain` | 1.4.0 | Core types: `BaseEntity`, `IRepository`, pagination, `ColumnMap` |
| `@rajkumarganesan93/application` | 1.1.0 | Entity mapper (`toEntity`/`toRow`), audit service, Pino logger |
| `@rajkumarganesan93/api` | 1.4.0 | `MessageCode`, `MessageCatalog`, response builders: `success()`, `error()`, `successPaginated()` |
| `@rajkumarganesan93/shared` | 1.4.0 | `getDbConfig()`, `asyncHandler()`, `parsePaginationFromQuery()` |
| `@rajkumarganesan93/infrastructure` | 1.8.0 | `createServiceApp()`, error classes, auth middleware, validation, Swagger utilities, `BaseRepository` |
| `@rajkumarganesan93/integrations` | 1.1.0 | `IEmailProvider`, `INotificationProvider` + stub implementations |

### Dependency Graph

```
domain (base — no dependencies)
  ├── application  → domain
  ├── shared       → domain
  ├── api          → domain
  └── infrastructure → domain, application, api
integrations (standalone — no dependencies)
```

> See [PACKAGES.md](PACKAGES.md) for detailed exports, usage examples, and installation instructions.

---

## How Services Are Built

Every service is bootstrapped with `createServiceApp()` from the infrastructure package. This factory wires up:

- Express with JSON body parsing
- CORS (cross-origin support for API Portal and frontends)
- Pino request logging
- Swagger UI at `/api-docs`
- JWT authentication (auto-enabled when Keycloak env vars are present)
- Health check at `/health`
- Global error handler with Message Catalog integration
- Graceful shutdown

```typescript
import { createServiceApp } from '@rajkumarganesan93/infrastructure';

const { start } = createServiceApp({
  serviceName: 'my-service',
  port: 3002,
  envPath,
  swaggerSpec,
  routes: (app) => {
    app.use(myRoutes);
  },
});

start();
```

---

## API Response Format

All APIs return a consistent JSON structure:

```jsonc
// Success
{
  "success": true,
  "messageCode": "CREATED",
  "message": "User created successfully",
  "data": { "id": "...", "name": "..." },
  "timestamp": "2026-02-26T07:15:16.065Z"
}

// Paginated
{
  "success": true,
  "messageCode": "LIST_FETCHED",
  "message": "User list fetched successfully",
  "data": {
    "items": [...],
    "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
  },
  "timestamp": "..."
}

// Error
{
  "success": false,
  "messageCode": "NOT_FOUND",
  "error": "User not found",
  "statusCode": 404,
  "timestamp": "..."
}
```

All messages come from a centralized `MessageCatalog` — developers use `MessageCode` enum values, never raw strings. This enables type-safety, consistent frontend handling, and future i18n support.

---

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Build all packages and services |
| `npm run build:packages` | Build packages only (in dependency order) |
| `npm run dev -w <service>` | Start a service with hot-reload (tsx) |
| `npm run dev:portal` | Start API Portal with hot-reload |
| `npm run migrate:all` | Run all database migrations |
| `npm run migrate:user` | Run user-service migrations only |
| `npm run migrate:shared-db-example` | Run shared-db-example migrations only |
| `npm run test` | Run tests across all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run format` | Format code with Prettier |
| `npm run publish:packages` | Build and publish all packages to GitHub Packages |

---

## Clean Architecture (per service)

Each service follows a layered architecture:

```
src/
├── domain/              # Entities (extend BaseEntity) + repository interfaces
├── application/         # Use cases (business logic orchestration)
├── infrastructure/      # Database connection + repository implementations
└── presentation/        # Controllers, routes, Swagger spec, Zod models
```

Data flows: **Route → Middleware (auth, validation) → Controller → Use Case → Repository → Database**

---

## Documentation

| Document | Description |
|---|---|
| [DEVELOPMENT.md](DEVELOPMENT.md) | Full development guide: architecture deep-dive, creating new services (step-by-step), coding conventions, migration guide |
| [PACKAGES.md](PACKAGES.md) | Package index with all exports, usage examples, dependency graph, install & publish instructions |
| [AUTHENTICATION.md](AUTHENTICATION.md) | Keycloak setup, OAuth 2.0 flows (PKCE, ROPC, Client Credentials), Postman token guide, frontend/mobile integration with code examples |
| [ERROR_CODES.md](ERROR_CODES.md) | Complete message code reference, HTTP status mapping, error response examples |

---

## License

Private — CargoEz Platform
