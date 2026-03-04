# CargoEz Backend

Node.js microservices monorepo built with **Nx**, **NestJS**, **pnpm**, PostgreSQL, Clean Architecture, and Keycloak authentication.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js >= 18.7.0 | Runtime |
| TypeScript 5.x | Language |
| **NestJS 11** | Application framework |
| **Nx 22** | Monorepo build system (caching, affected commands, dependency graph) |
| **pnpm 10** | Fast, disk-efficient package manager |
| PostgreSQL 16 | Database |
| Knex.js | Query builder & migrations |
| Keycloak 26.x | Identity & access management (OAuth 2.0 / OIDC) |
| class-validator / class-transformer | Request validation (DTO decorators) |
| Pino | Structured logging |
| Socket.IO | Real-time data sync (WebSocket) |
| Swagger UI (@nestjs/swagger) | API documentation |

---

## Project Structure

```
BACKEND/
├── apps/                               # NestJS applications
│   ├── user-service/                   # User CRUD (port 3001)
│   ├── shared-db-example/              # Country CRUD (port 3005)
│   └── api-portal/                     # Combined Swagger UI (port 4000)
├── libs/                               # Shared libraries (@cargoez/*)
│   ├── domain/                         # Core types: BaseEntity, IRepository, pagination
│   ├── api/                            # MessageCode, MessageCatalog, ApiResponse, exceptions
│   ├── shared/                         # DatabaseModule (Knex), InjectKnex decorator
│   └── infrastructure/                 # Auth guards, request context, BaseRepository,
│                                       #   realtime gateway, logger, exception filter
├── keycloak/
│   └── cargoez-realm.json              # Keycloak realm config (clients, users, roles)
├── register-paths.js                   # Runtime module resolution for @cargoez/* libs
├── nx.json                             # Nx workspace configuration
├── pnpm-workspace.yaml                 # pnpm workspace packages
├── tsconfig.base.json                  # Shared TypeScript config with path aliases
├── .env.example                        # Environment variable template
├── DEVELOPMENT.md                      # Full development guide & coding conventions
├── AUTHENTICATION.md                   # Keycloak setup, OAuth/PKCE, token management
└── ARCHITECTURE-COMPARISON.md          # Express vs NestJS migration analysis
```

---

## How to Run

### Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | >= 18.7.0 | `node -v` |
| pnpm | >= 9 | `pnpm -v` (install: `npm i -g pnpm`) |
| PostgreSQL | 16+ | Running on `localhost:5432` |
| Keycloak | 26.x | For API authentication |

### Step 1 — Install dependencies

```bash
pnpm install
```

### Step 2 — Create database

Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE cargoez;
```

Both services share a single database by default. Override with `DB_NAME` in `.env`.

### Step 3 — Configure environment

Copy the example and edit as needed:

```bash
cp .env.example .env
```

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=cargoez

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=cargoez

# Services (optional overrides)
USER_SERVICE_PORT=3001
SHARED_DB_SERVICE_PORT=3005
API_PORTAL_PORT=4000
```

### Step 4 — Run database migrations

```bash
pnpm migrate:user
pnpm migrate:shared
```

### Step 5 — Build everything

```bash
pnpm build
```

This builds all 4 libraries and 3 applications using Nx's dependency-aware task runner with caching.

### Step 6 — Start Keycloak

**Option A — Standalone (Java/OpenJDK 21)**

```bash
# Download Keycloak from https://www.keycloak.org/downloads
copy keycloak\cargoez-realm.json <keycloak-dir>\data\import\cargoez-realm.json
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

| Credential | Username | Password | Purpose |
|---|---|---|---|
| Admin Console | `admin` | `admin` | Keycloak admin UI at `/admin` |
| API User (admin) | `admin` | `admin123` | For API token acquisition |
| API User (user) | `testuser` | `test123` | For API token acquisition |
| API User (manager) | `manager` | `manager123` | For API token acquisition |

### Step 7 — Start all services

```bash
# Option A: Using Nx (recommended)
pnpm start:all

# Option B: Individual services
pnpm start:user     # User Service on :3001
pnpm start:shared   # Shared DB Example on :3005
pnpm start:portal   # API Portal on :4000

# Option C: Direct node (after build)
pnpm dev:user
pnpm dev:shared
pnpm dev:portal
```

### Step 8 — Verify

| Service | URL | Description |
|---|---|---|
| User Service — Health | http://localhost:3001/user-service/health | Health check |
| User Service — Swagger | http://localhost:3001/user-service/api-docs | API docs |
| Shared DB — Health | http://localhost:3005/shared-db-example/health | Health check |
| Shared DB — Swagger | http://localhost:3005/shared-db-example/api-docs | API docs |
| **API Portal** | **http://localhost:4000/api-docs** | **Combined Swagger UI** |
| Keycloak | http://localhost:8080 | Identity provider |

---

## API Portal

The API Portal at `http://localhost:4000/api-docs` provides a single Swagger UI aggregating all microservices. It fetches OpenAPI specs from each running service and auto-refreshes every 30 seconds.

---

## Authentication & Authorization

All APIs are protected with **JWT Bearer tokens** via **Keycloak** (OAuth 2.0 / OIDC / JWKS).

### Getting a Token

```bash
curl -X POST http://localhost:8080/realms/cargoez/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=cargoez-api&username=admin&password=admin123"
```

### Using the Token

```bash
curl http://localhost:3001/user-service/users \
  -H "Authorization: Bearer <your_token>"
```

In Swagger UI, click **Authorize** and paste: `Bearer <your_token>`

### Role-Based Access Control

Routes are protected by Keycloak realm roles via the `@Roles()` decorator:

| Operation | Required Role | Example |
|---|---|---|
| Read (GET) | Any authenticated user | `GET /user-service/users` |
| Create (POST) | `admin` | `POST /user-service/users` |
| Update (PUT) | `admin` | `PUT /user-service/users/:id` |
| Delete (DELETE) | `admin` | `DELETE /user-service/users/:id` |

### Keycloak Clients

| Client ID | Grant Type | Purpose |
|---|---|---|
| `cargoez-api` | Password (ROPC) | Postman / API testing |
| `cargoez-web` | Auth Code + PKCE | Frontend web apps (ports 3000, 5173, 5174, 4200) |
| `cargoez-mobile` | Auth Code + PKCE | Mobile apps |
| `cargoez-service` | Client Credentials | Service-to-service |

> See [AUTHENTICATION.md](AUTHENTICATION.md) for the full guide.

---

## Shared Libraries

| Library | Scope | Purpose |
|---|---|---|
| `@cargoez/domain` | `libs/domain` | `BaseEntity`, `IBaseRepository`, `PaginationOptions`, `PaginatedResult` |
| `@cargoez/api` | `libs/api` | `MessageCode`, `MessageCatalog`, `ApiResponse`, `AppException`, `NotFoundException`, `ValidationException` |
| `@cargoez/shared` | `libs/shared` | `DatabaseModule` (Knex provider), `@InjectKnex()` decorator |
| `@cargoez/infrastructure` | `libs/infrastructure` | `JwtAuthGuard`, `RolesGuard`, `@Public()`, `@Roles()`, `RequestContext`, `ContextInterceptor`, `BaseRepository`, `RealtimeGateway`, `PinoLoggerService`, `GlobalExceptionFilter` |

### Dependency Graph

```
domain  (no dependencies)
api     (no dependencies)
shared  (no dependencies)
infrastructure → domain, api, shared
```

---

## How Services Are Built

Each NestJS service follows a consistent pattern:

```typescript
// main.ts — Bootstrap
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('my-service');
app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
app.useGlobalFilters(new GlobalExceptionFilter());
app.useGlobalInterceptors(new ContextInterceptor());
```

```typescript
// app.module.ts — Module composition
@Module({
  imports: [DatabaseModule.forRoot(), AuthModule, RealtimeModule, MyFeatureModule],
})
export class AppModule {}
```

Features wired automatically via shared modules:

- **AuthModule** — Global JWT auth guard + roles guard (use `@Public()` to skip auth)
- **RealtimeModule** — Socket.IO gateway with JWT-authenticated WebSocket connections
- **DatabaseModule** — Knex connection pool, injected via `@InjectKnex()`
- **ContextInterceptor** — AsyncLocalStorage-based request context (`userId`, `tenantId`, `requestId`)
- **GlobalExceptionFilter** — Consistent error responses using MessageCatalog
- **BaseRepository** — Generic CRUD with auto audit fields and domain event emission

---

## API Response Format

```json
{
  "success": true,
  "messageCode": "LIST_FETCHED",
  "message": "Resources fetched successfully",
  "data": {
    "data": [...],
    "pagination": { "page": 1, "limit": 10, "total": 50, "totalPages": 5 }
  }
}
```

```json
{
  "success": false,
  "messageCode": "NOT_FOUND",
  "message": "Resource not found",
  "errors": ["User not found"]
}
```

---

## Real-Time Data Sync

When `RealtimeModule` is imported, Socket.IO is attached to the HTTP server. `BaseRepository` automatically emits domain events on data mutations (create, update, delete), which are broadcast to subscribed WebSocket clients.

**Frontend integration:**
```typescript
const socket = io('http://localhost:3001', { auth: { token: 'jwt...' } });
socket.emit('subscribe', { room: 'entity:users' });
socket.on('data-changed', (event) => { /* refresh data */ });
```

**Room strategy:**
- `entity:<table>` — all changes for a table
- `entity:<table>:<id>` — changes for a specific record
- `tenant:<tenantId>` — all changes for a tenant

---

## Scripts

| Command | Description |
|---|---|
| `pnpm build` | Build all libs and apps (Nx cached) |
| `pnpm build:affected` | Build only changed projects |
| `pnpm start:all` | Start all services in parallel |
| `pnpm start:user` | Start user-service |
| `pnpm start:shared` | Start shared-db-example |
| `pnpm start:portal` | Start API Portal |
| `pnpm dev:user` | Run user-service (post-build) |
| `pnpm dev:shared` | Run shared-db-example (post-build) |
| `pnpm dev:portal` | Run API Portal (post-build) |
| `pnpm migrate:user` | Run user-service DB migrations |
| `pnpm migrate:shared` | Run shared-db-example DB migrations |
| `pnpm test` | Run tests (Nx cached) |
| `pnpm lint` | Lint all projects (Nx cached) |
| `pnpm graph` | Open Nx dependency graph visualization |

---

## Clean Architecture (per service)

Each service follows strict Clean Architecture with 4 layers. Dependencies point inward — domain has zero framework imports.

```
src/
├── main.ts                              # Bootstrap: NestFactory, Swagger, global pipes/filters
├── app.module.ts                        # Root module (imports DB, Auth, Realtime, feature modules)
│
├── domain/                              # Pure TypeScript — NO NestJS, NO framework deps
│   ├── entities/
│   │   └── user.entity.ts               # Interface extending BaseEntity
│   └── repositories/
│       └── user-repository.interface.ts  # IUserRepository + DI token
│
├── application/                         # Use cases — orchestrate business logic
│   └── use-cases/
│       ├── create-user.use-case.ts       # @Injectable, injects IUserRepository via token
│       ├── get-all-users.use-case.ts
│       ├── get-user-by-id.use-case.ts
│       ├── update-user.use-case.ts
│       └── delete-user.use-case.ts
│
├── infrastructure/                      # Implementations — Knex, external services
│   └── repositories/
│       └── user.repository.ts            # extends BaseRepository, implements IUserRepository
│
└── presentation/                        # NestJS controllers, DTOs, module wiring
    ├── controllers/
    │   ├── users.controller.ts           # Injects use cases, not repositories
    │   └── health.controller.ts
    ├── dto/
    │   ├── create-user.dto.ts            # class-validator + Swagger decorators
    │   └── update-user.dto.ts
    └── users.module.ts                   # Binds IUserRepository → UserRepository via DI
```

**Data flow:** Route → Guard (auth) → Controller → Use Case → Repository Interface → Repository Implementation → Database

**DI wiring (in `users.module.ts`):**
```typescript
{ provide: USER_REPOSITORY, useClass: UserRepository }
```
This lets use cases depend on the domain interface, while NestJS injects the infrastructure implementation.

---

## Documentation

| Document | Description |
|---|---|
| [DEVELOPMENT.md](DEVELOPMENT.md) | Full development guide & coding conventions |
| [AUTHENTICATION.md](AUTHENTICATION.md) | Keycloak setup, OAuth 2.0 flows, token management |
| [ARCHITECTURE-COMPARISON.md](ARCHITECTURE-COMPARISON.md) | Express vs NestJS migration analysis |

---

## License

Private — CargoEz Platform
