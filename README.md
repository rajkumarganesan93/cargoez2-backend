# CargoEz Backend

Node.js microservices monorepo built with **Nx**, **NestJS**, **pnpm**, PostgreSQL, **Clean Architecture**, and **Keycloak** authentication. Multi-tenant SaaS with centralized admin management and per-tenant database isolation.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js >= 18.7.0 | Runtime |
| TypeScript 5.x | Language |
| **NestJS 11** | Application framework |
| **Nx 22** | Monorepo build system (caching, affected commands, dependency graph) |
| **pnpm 10** | Fast, disk-efficient package manager |
| PostgreSQL 16+ | Database |
| Knex.js | SQL query builder |
| Keycloak 26.x | Identity & access management (OAuth 2.0 / OIDC) |
| class-validator / class-transformer | DTO validation (decorator-based) |
| Pino | Structured JSON logging |
| Socket.IO | Real-time data sync (WebSocket) |
| Swagger UI (`@nestjs/swagger`) | Interactive API documentation |

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                     Frontend Portals                                │
│  admin.cargoez.com (SysAdmin)        app.cargoez.com (Tenant)      │
└──────────┬───────────────────────────────────┬─────────────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ admin-service    │  │ freight-service  │  │ contacts-service │  │ books-service    │
│ :3001            │  │ :3002            │  │ :3003            │  │ :3004            │
│                  │  │                  │  │                  │  │                  │
│ admin_db (24 tbl)│  │ tenant DBs only  │  │ tenant DBs only  │  │ tenant DBs only  │
│ + tenant DBs     │  │ (via TenantConn  │  │ (via TenantConn  │  │ (via TenantConn  │
│ (access control) │  │  Manager)        │  │  Manager)        │  │  Manager)        │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                      │                     │
         ▼                     ▼                      ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Shared Libraries: @cargoez/domain  @cargoez/api  @cargoez/shared  @cargoez/infra   │
└──────────────────────────────────────────────────────────────────────────────────────┘
         │                                                          │
┌────────▼───────────────────────────────────┐   ┌──────────────────▼──┐
│  PostgreSQL :5432                           │   │  Keycloak :8080     │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │   │  cargoez realm      │
│  │ admin_db │ │shared_db │ │tenant_XXX_db│ │   │  ├─ cargoez-admin   │
│  │ (central)│ │ (shared) │ │ (per tenant)│ │   │  └─ cargoez-web     │
│  └──────────┘ └──────────┘ └─────────────┘ │   └─────────────────────┘
└────────────────────────────────────────────┘
```

### Services

| Service | Port | Database(s) | Responsibility |
|---|---|---|---|
| `admin-service` | 3001 | `admin_db` + tenant DBs (`shared_db` / `{tenant_code}_db`) | Central management, tenant provisioning, user identity, resolve-context, access control |
| `freight-service` | 3002 | Tenant DBs only (via `TenantConnectionManager`) | Freight / shipment operations |
| `contacts-service` | 3003 | Tenant DBs only (via `TenantConnectionManager`) | Contact management |
| `books-service` | 3004 | Tenant DBs only (via `TenantConnectionManager`) | Books / accounting |
| `api-portal` | 4000 | — | Swagger aggregator + reverse proxy gateway |

### Key Principles

- **Multi-tenant SaaS**: Per-tenant database isolation with centralized admin
- **Clean Architecture**: 4-layer separation (Domain -> Application -> Infrastructure -> Presentation)
- **Single resolve-context endpoint**: One internal HTTP call resolves user identity, DB connection, and permissions
- **Pure ABAC**: Keycloak for authentication, attribute-based access control for authorization
- **Convention over Configuration**: All services follow identical structure and patterns

---

## Database Strategy

### Three Database Types

| Database | Owner | Contents |
|---|---|---|
| `admin_db` | `admin-service` | 24 tables: tenants, branches, sys_admins, app_customers, admin roles/permissions, subscriptions, products, metadata |
| `shared_db` | All tenant services | Shared multi-tenant database for normal tenants (10 tables) |
| `{tenant_code}_db` | All tenant services | Dedicated database for enterprise tenants (same 10-table schema as shared_db) |

### How Services Connect

- **admin-service** connects to `admin_db` directly for central management, and to tenant DBs for access control lookups during resolve-context
- **freight-service / contacts-service / books-service** connect only to tenant DBs via `TenantConnectionManager`, which resolves the correct database from the request context

### BaseEntity

Every table extends a standard 7-column base:

| Column | Type | Description |
|---|---|---|
| `uid` | UUID (PK) | Primary key |
| `tenant_uid` | UUID | Tenant identifier |
| `is_active` | boolean | Soft-delete flag |
| `created_at` | timestamp | Record creation time |
| `modified_at` | timestamp | Last modification time |
| `created_by` | UUID | User who created the record |
| `modified_by` | UUID | User who last modified the record |

---

## Authentication & Authorization

### Keycloak (Authentication)

Two Keycloak clients in the `cargoez` realm:

| Client ID | Purpose | Grant Type |
|---|---|---|
| `cargoez-admin` | SysAdmin portal (`admin.cargoez.com`) | Auth Code + PKCE |
| `cargoez-web` | Tenant portal (`app.cargoez.com`) | Auth Code + PKCE |

### Realm Roles

| Role | Description |
|---|---|
| `sys_admin` | System administrator (full platform access) |
| `tenant_admin` | Tenant administrator (full tenant access) |
| `app_customer` | Standard application user |
| `branch_customer` | Branch-level user |

### Pure ABAC (Authorization)

Permission keys follow the format `module.operation` (e.g., `freight.create`, `contacts.update`).

**Guard pipeline (every request):**

1. **JwtAuthGuard** — Validates JWT via Keycloak JWKS
2. **ContextInterceptor** — Calls `admin-service /internal/resolve-context` once per request (cached 5 min). Resolves: user identity, tenant DB connection, permissions
3. **PermissionsGuard** — Reads permissions from `RequestContext` (no HTTP call). Checks `@RequirePermission('module.operation')`

> See [AUTHENTICATION.md](AUTHENTICATION.md) for full details and [RBAC-ABAC.md](RBAC-ABAC.md) for the ABAC permission model.

---

## Project Structure

```
BACKEND/
├── apps/
│   ├── admin-service/                   # Central management (port 3001)
│   │   └── src/
│   │       ├── domain/                  # Pure interfaces (entities, repository contracts)
│   │       ├── application/             # Use cases (business logic)
│   │       ├── infrastructure/          # Concrete implementations (Knex repositories)
│   │       ├── presentation/            # Controllers, DTOs, NestJS module wiring
│   │       ├── app.module.ts
│   │       └── main.ts
│   ├── freight-service/                 # Freight operations (port 3002)
│   ├── contacts-service/               # Contact management (port 3003)
│   └── books-service/                  # Books / accounting (port 3004)
│
├── libs/                                # Shared libraries (imported as @cargoez/*)
│   ├── domain/                          # BaseEntity, IBaseRepository, PaginationOptions
│   ├── api/                             # MessageCode, MessageCatalog, ApiResponse, exceptions
│   ├── shared/                          # DatabaseModule, TenantConnectionManager, @InjectKnex()
│   └── infrastructure/                  # Auth guards, PermissionsGuard, ABAC evaluator,
│                                        #   RequestContext, ContextInterceptor, BaseRepository,
│                                        #   TenantBaseRepository, realtime gateway, logger
│
├── keycloak/
│   └── cargoez-realm.json               # Keycloak realm config (clients, users, roles)
├── register-paths.js                    # Runtime module resolution for @cargoez/* libs
├── nx.json                              # Nx workspace configuration
├── pnpm-workspace.yaml                  # pnpm workspace definition
├── tsconfig.base.json                   # Shared TypeScript config with path aliases
├── .env.example                         # Environment variable template
│
├── DEVELOPMENT.md                       # Development guide & coding conventions
├── AUTHENTICATION.md                    # Keycloak setup, multi-tenant auth flow
├── RBAC-ABAC.md                         # ABAC permission system documentation
├── PACKAGES.md                          # Shared libraries reference & exports
└── ERROR_CODES.md                       # Message codes & error response reference
```

---

## How to Run

### Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | >= 18.7.0 | `node -v` |
| pnpm | >= 9 | `pnpm -v` (install: `npm i -g pnpm`) |
| PostgreSQL | 16+ | Running on `localhost:5432` |
| Keycloak | 26.x | Running on `localhost:8080` |

### Step 1 — Install dependencies

```bash
pnpm install
```

### Step 2 — Create databases

Connect to PostgreSQL and create the required databases:

```sql
CREATE DATABASE admin_db;
CREATE DATABASE shared_db;
-- Per-tenant databases are created during tenant provisioning
```

### Step 3 — Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD="your_password_here"

# Admin Service database
ADMIN_SERVICE_DB_NAME=admin_db

# Shared tenant database
SHARED_DB_NAME=shared_db

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=cargoez
KEYCLOAK_ISSUER=http://localhost:8080/realms/cargoez

# Service ports
ADMIN_SERVICE_PORT=3001
FREIGHT_SERVICE_PORT=3002
CONTACTS_SERVICE_PORT=3003
BOOKS_SERVICE_PORT=3004

# Internal service URLs (for resolve-context calls)
ADMIN_SERVICE_URL=http://localhost:3001
```

### Step 4 — Run database migrations and seed

```bash
pnpm migrate:admin      # Creates 20 tables in admin_db + seed data
pnpm migrate:shared     # Creates shared reference tables in shared_db
```

### Step 5 — Build everything

```bash
pnpm build
```

Nx builds all libraries and applications in dependency order with intelligent caching.

### Step 6 — Start Keycloak

**Option A — Docker**

```bash
docker run -d --name keycloak \
  -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -v ./keycloak/cargoez-realm.json:/opt/keycloak/data/import/cargoez-realm.json \
  quay.io/keycloak/keycloak:26.1.0 start-dev --import-realm
```

**Option B — Standalone (Java/OpenJDK 21)**

```bash
copy keycloak\cargoez-realm.json <keycloak-dir>\data\import\cargoez-realm.json
<keycloak-dir>\bin\kc.bat start-dev --import-realm
```

**Keycloak Admin Console:** http://localhost:8080/admin (login: `admin` / `admin`)

### Step 7 — Start all services

```bash
# All at once (using Nx)
pnpm start:all

# Or individually
pnpm start:admin        # Admin Service on :3001
pnpm start:freight      # Freight Service on :3002
pnpm start:contacts     # Contacts Service on :3003
pnpm start:books        # Books Service on :3004
```

### Step 8 — Verify

| Service | URL | Description |
|---|---|---|
| Admin Service — Swagger | http://localhost:3001/admin-service/api-docs | Admin Service API docs |
| Admin Service — Health | http://localhost:3001/admin-service/health | Health check |
| Freight Service — Swagger | http://localhost:3002/freight-service/api-docs | Freight API docs |
| Contacts Service — Swagger | http://localhost:3003/contacts-service/api-docs | Contacts API docs |
| Books Service — Swagger | http://localhost:3004/books-service/api-docs | Books API docs |
| Keycloak | http://localhost:8080 | Identity provider |

---

## Shared Libraries

| Library | Import Path | Purpose |
|---|---|---|
| `@cargoez/domain` | `libs/domain` | `BaseEntity` (uid, tenant_uid, is_active, timestamps, audit), `IBaseRepository`, `PaginationOptions`, `PaginatedResult` |
| `@cargoez/api` | `libs/api` | `MessageCode`, `MessageCatalog`, `ApiResponse`, `AppException`, `NotFoundException`, `AlreadyExistsException`, `ValidationException` |
| `@cargoez/shared` | `libs/shared` | `DatabaseModule.forRoot()`, `TenantConnectionManager`, `@InjectKnex()`, `KNEX_CONNECTION` |
| `@cargoez/infrastructure` | `libs/infrastructure` | `JwtAuthGuard`, `PermissionsGuard`, `@Public()`, `@RequirePermission()`, `AbacEvaluator`, `AuthModule`, `RequestContext`, `ContextInterceptor`, `BaseRepository`, `TenantBaseRepository`, `RealtimeGateway`, `RealtimeModule`, `PinoLoggerService`, `GlobalExceptionFilter` |

**Dependency graph:**

```
domain          (no dependencies — pure interfaces)
api             (no dependencies — pure enums/functions)
shared          (no dependencies — NestJS module only)
infrastructure  → domain, api, shared
```

> See [PACKAGES.md](PACKAGES.md) for the complete export reference.

---

## Frontend Portals

| Portal | URL | Keycloak Client | Purpose |
|---|---|---|---|
| SysAdmin Portal | `admin.cargoez.com` | `cargoez-admin` | Platform administration, tenant management |
| Tenant Portal | `app.cargoez.com` | `cargoez-web` | Tenant application (freight, contacts, books) |

---

## API Response Format

**Every** response (success or error) uses a consistent envelope:

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  messageCode: string;
  message: string;
  data?: T;
  errors?: any[];
}
```

> See [ERROR_CODES.md](ERROR_CODES.md) for the complete message code reference.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build all libs and apps (Nx cached, dependency-aware) |
| `pnpm build:affected` | Build only changed projects |
| `pnpm start:all` | Start all services in parallel |
| `pnpm start:admin` | Start admin-service |
| `pnpm start:freight` | Start freight-service |
| `pnpm start:contacts` | Start contacts-service |
| `pnpm start:books` | Start books-service |
| `pnpm migrate:admin` | Run admin-service DB migrations + seed data |
| `pnpm migrate:shared` | Run shared DB migrations |
| `pnpm test` | Run tests (Nx cached) |
| `pnpm lint` | Lint all projects (Nx cached) |
| `pnpm graph` | Open Nx dependency graph visualization |
| `node scripts/setup-multi-tenant.js` | Seed shared tenants (Demo + Acme) with access control and business data |
| `node scripts/setup-enterprise-tenant.js` | Create enterprise tenant (Global Freight) with dedicated DB |
| `node scripts/generate-schema-docs.js` | Generate DOCX and Excel database schema files in `docs/` |

---

## Documentation

| Document | Description |
|---|---|
| [PACKAGES.md](PACKAGES.md) | Shared libraries — all exports, usage examples, dependency graph |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Development guide — Clean Architecture, adding new entities, coding conventions |
| [AUTHENTICATION.md](AUTHENTICATION.md) | Keycloak setup, multi-tenant auth, resolve-context flow |
| [ERROR_CODES.md](ERROR_CODES.md) | Message codes, HTTP statuses, error response examples |
| [RBAC-ABAC.md](RBAC-ABAC.md) | Pure ABAC permission system — two-database authorization, conditions, evaluator |
| [ARCHITECTURE-COMPARISON.md](ARCHITECTURE-COMPARISON.md) | ADR: Express → Nx + NestJS migration history |
| [TEMPORAL-HANDOVER.md](TEMPORAL-HANDOVER.md) | Temporal workflow integration points and handover documentation |

### Database Schema Files

| File | Format | Contents |
|---|---|---|
| [`docs/CargoEz-Database-Schema.docx`](../docs/CargoEz-Database-Schema.docx) | Word | All tables with columns, organized by database |
| [`docs/CargoEz-Database-Schema.xlsx`](../docs/CargoEz-Database-Schema.xlsx) | Excel | Separate sheets per database with column specifications |

---

## Test Credentials

### SysAdmin Portal (admin.cargoez.com — port 5177)

| User | Password | Role |
|---|---|---|
| `admin@cargoez.com` | `admin123` | Super Admin (full access) |
| `support@cargoez.com` | `support123` | Support Admin |
| `ops@cargoez.com` | `ops123` | Operations Admin |

### Tenant Portal (app.cargoez.com — port 5173)

| User | Password | Tenant | Role |
|---|---|---|---|
| `manager@demo.cargoez.com` | `demo123` | Demo Logistics | Manager |
| `viewer@demo.cargoez.com` | `demo123` | Demo Logistics | Viewer |
| `manager@acme.cargoez.com` | `acme123` | Acme Logistics | Manager |
| `viewer@acme.cargoez.com` | `acme123` | Acme Logistics | Viewer |
| `admin@globalfreight.cargoez.com` | `global123` | Global Freight Corp (Enterprise) | Admin |
| `ops@globalfreight.cargoez.com` | `global123` | Global Freight Corp (Enterprise) | Operations |

---

## License

Private — CargoEz Platform
