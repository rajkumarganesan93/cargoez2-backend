# CargoEz Backend

Node.js microservices monorepo built with **Nx**, **NestJS**, **pnpm**, PostgreSQL, **Clean Architecture**, and **Keycloak** authentication.

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

## Project Structure

```
BACKEND/
├── apps/                                # Independently deployable NestJS services
│   ├── user-service/                    # User management CRUD (port 3001)
│   │   └── src/
│   │       ├── domain/                  # Pure interfaces (entities, repository contracts)
│   │       ├── application/             # Use cases (business logic)
│   │       ├── infrastructure/          # Concrete implementations (Knex repositories)
│   │       ├── presentation/            # Controllers, DTOs, NestJS module wiring
│   │       ├── app.module.ts            # Root module
│   │       └── main.ts                  # Bootstrap
│   ├── shared-db-example/               # Country management CRUD (port 3005)
│   │   └── src/                         # Same Clean Architecture layers as above
│   └── api-portal/                      # Swagger UI aggregator + reverse proxy (port 4000)
│
├── libs/                                # Shared libraries (imported as @cargoez/*)
│   ├── domain/                          # BaseEntity, IBaseRepository, PaginationOptions
│   ├── api/                             # MessageCode, MessageCatalog, ApiResponse, exceptions
│   ├── shared/                          # DatabaseModule (Knex provider), @InjectKnex()
│   └── infrastructure/                  # Auth guards, request context, BaseRepository,
│                                        #   realtime gateway, logger, exception filter
│
├── keycloak/
│   └── cargoez-realm.json               # Keycloak realm config (clients, users, roles)
├── register-paths.js                    # Runtime module resolution for @cargoez/* libs
├── nx.json                              # Nx workspace configuration
├── pnpm-workspace.yaml                  # pnpm workspace definition
├── tsconfig.base.json                   # Shared TypeScript config with path aliases
├── .env.example                         # Environment variable template
│
├── PACKAGES.md                          # Shared libraries reference & exports
├── DEVELOPMENT.md                       # Full development guide & coding conventions
├── AUTHENTICATION.md                    # Keycloak setup, OAuth/PKCE, token management
├── ERROR_CODES.md                       # Message codes & error response reference
└── ARCHITECTURE-COMPARISON.md           # Express → NestJS migration analysis
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

Each microservice uses its own database. Connect to PostgreSQL and create them:

```sql
CREATE DATABASE user_service_db;
CREATE DATABASE master_db;
```

### Step 3 — Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Default database connection (used when per-service vars are not set)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD="your_password_here"

# User Service database (prefix: USER_SERVICE)
USER_SERVICE_DB_NAME=user_service_db
# USER_SERVICE_DB_HOST=some-other-host     # uncomment to override defaults
# USER_SERVICE_DB_PORT=5432
# USER_SERVICE_DB_USER=user_svc_user
# USER_SERVICE_DB_PASSWORD="secret"

# Shared DB Example database (prefix: SHARED_DB)
SHARED_DB_DB_NAME=master_db
# SHARED_DB_DB_HOST=shared-instance.rds.amazonaws.com
# SHARED_DB_DB_PORT=5432
# SHARED_DB_DB_USER=shared_user
# SHARED_DB_DB_PASSWORD="secret"

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=cargoez

# Services (optional port overrides)
USER_SERVICE_PORT=3001
SHARED_DB_SERVICE_PORT=3005
API_PORTAL_PORT=4000
```

> **Note:** If your password contains special characters (e.g., `#`, `$`), wrap it in double quotes.
>
> Each service reads `{PREFIX}_DB_HOST`, `{PREFIX}_DB_PORT`, etc. If not set, it falls back to the shared `DB_*` values. This allows services to use completely different database servers when needed.

### Step 4 — Run database migrations

```bash
pnpm migrate:user      # Creates tables in user_service_db
pnpm migrate:shared    # Creates tables in master_db
```

### Step 5 — Build everything

```bash
pnpm build
```

Nx builds all 4 libraries and 3 applications in dependency order with intelligent caching.

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

**Pre-configured users:**

| Username | Password | Roles | Purpose |
|---|---|---|---|
| `admin` | `admin123` | `admin`, `user` | Full access to all APIs |
| `testuser` | `test123` | `user` | Read-only access |
| `manager` | `manager123` | `manager`, `user` | Mid-level access |

**Keycloak Admin Console:** http://localhost:8080/admin (login: `admin` / `admin`)

### Step 7 — Start all services

```bash
# All at once (using Nx)
pnpm start:all

# Or individually
pnpm start:user       # User Service on :3001
pnpm start:shared     # Shared DB Example on :3005
pnpm start:portal     # API Portal on :4000

# Or direct node (after build)
pnpm dev:user
pnpm dev:shared
pnpm dev:portal
```

### Step 8 — Verify

| Service | URL | Description |
|---|---|---|
| **API Portal** | **http://localhost:4000/api-docs** | **Swagger UI with service selector dropdown** |
| User Service — Swagger | http://localhost:3001/user-service/api-docs | User Service API docs |
| User Service — Health | http://localhost:3001/user-service/health | Health check |
| Shared DB — Swagger | http://localhost:3005/shared-db-example/api-docs | Shared DB Example API docs |
| Shared DB — Health | http://localhost:3005/shared-db-example/health | Health check |
| Keycloak | http://localhost:8080 | Identity provider |

---

## Microservices

| Service | Port | Database | Global Prefix | Description |
|---|---|---|---|---|
| `user-service` | 3001 | `user_service_db` | `/user-service` | User CRUD, `/users/me` |
| `shared-db-example` | 3005 | `master_db` | `/shared-db-example` | Country CRUD |
| `api-portal` | 4000 | — | — | Swagger aggregator + reverse proxy |

Each service is a standalone NestJS application with its own database, Swagger docs, and WebSocket gateway. Services can be deployed and scaled independently.

### API Portal

The API Portal at `http://localhost:4000/api-docs` provides:

- **Service selector dropdown** — pick which microservice's API to view
- **Reverse proxy** — "Try it out" calls are proxied to the correct service
- **Live specs** — each service's OpenAPI spec is fetched in real-time

All API calls through the portal are transparently forwarded:
- `http://localhost:4000/user-service/*` → `http://localhost:3001/user-service/*`
- `http://localhost:4000/shared-db-example/*` → `http://localhost:3005/shared-db-example/*`

---

## Clean Architecture (per service)

Every service follows strict **Clean Architecture** with 4 layers. Dependencies always point inward — the domain layer has zero framework imports.

```
src/
├── domain/                              # Pure TypeScript — NO framework dependencies
│   ├── entities/
│   │   └── user.entity.ts               # Interface extending BaseEntity
│   └── repositories/
│       └── user-repository.interface.ts  # IUserRepository type + DI token constant
│
├── application/                         # Business logic — depends only on domain
│   └── use-cases/
│       ├── create-user.use-case.ts      # @Injectable, @Inject(USER_REPOSITORY)
│       ├── get-all-users.use-case.ts
│       ├── get-user-by-id.use-case.ts
│       ├── update-user.use-case.ts
│       └── delete-user.use-case.ts
│
├── infrastructure/                      # Concrete implementations
│   └── repositories/
│       └── user.repository.ts           # extends BaseRepository<User>, uses Knex
│
└── presentation/                        # HTTP layer + DI wiring
    ├── controllers/
    │   ├── users.controller.ts          # Injects use cases (not repositories)
    │   └── health.controller.ts
    ├── dto/
    │   ├── create-user.dto.ts           # class-validator + @nestjs/swagger decorators
    │   └── update-user.dto.ts
    └── users.module.ts                  # Binds USER_REPOSITORY → UserRepository
```

**Dependency rule:** `Presentation → Application → Domain ← Infrastructure`

**Data flow:** `HTTP Request → Auth Guard → Controller → Use Case → Repository Interface → Repository Impl → Database`

**DI wiring (in `users.module.ts`):**

```typescript
@Module({
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    CreateUserUseCase,
    GetAllUsersUseCase,
    // ...
  ],
  controllers: [UsersController],
})
export class UsersModule {}
```

Use cases depend on the `IUserRepository` domain interface. NestJS injects the `UserRepository` infrastructure implementation at runtime via the `USER_REPOSITORY` DI token.

---

## Shared Libraries

| Library | Import Path | Purpose |
|---|---|---|
| `@cargoez/domain` | `libs/domain` | `BaseEntity`, `IBaseRepository`, `PaginationOptions`, `PaginatedResult` |
| `@cargoez/api` | `libs/api` | `MessageCode`, `MessageCatalog`, `ApiResponse`, `AppException`, `NotFoundException`, `AlreadyExistsException`, `ValidationException` |
| `@cargoez/shared` | `libs/shared` | `DatabaseModule.forRoot()`, `@InjectKnex()`, `KNEX_CONNECTION` |
| `@cargoez/infrastructure` | `libs/infrastructure` | `JwtAuthGuard`, `RolesGuard`, `@Public()`, `@Roles()`, `AuthModule`, `RequestContext`, `ContextInterceptor`, `BaseRepository`, `RealtimeGateway`, `RealtimeModule`, `DomainEvent`, `domainEventBus`, `PinoLoggerService`, `GlobalExceptionFilter` |

**Dependency graph:**

```
domain          (no dependencies — pure interfaces)
api             (no dependencies — pure enums/functions)
shared          (no dependencies — NestJS module only)
infrastructure  → domain, api, shared
```

> See [PACKAGES.md](PACKAGES.md) for the complete export reference.

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
curl http://localhost:4000/user-service/users \
  -H "Authorization: Bearer <access_token>"
```

In Swagger UI, click **Authorize** and paste: `Bearer <access_token>`

### Role-Based Access Control

Routes are protected via the `@Roles()` decorator:

| Operation | Required Role |
|---|---|
| `GET` (list, get by ID, `/me`) | Any authenticated user |
| `POST` (create) | `admin` |
| `PUT` (update) | `admin` |
| `DELETE` (delete) | `admin` |

### Keycloak Clients

| Client ID | Grant Type | Purpose |
|---|---|---|
| `cargoez-api` | Password (ROPC) | Postman / API testing |
| `cargoez-web` | Auth Code + PKCE | Frontend web apps (ports 3000, 5173, 5174, 4200) |
| `cargoez-mobile` | Auth Code + PKCE | Mobile apps |
| `cargoez-service` | Client Credentials | Service-to-service |

> See [AUTHENTICATION.md](AUTHENTICATION.md) for the full guide including PKCE flows, token anatomy, and frontend/mobile integration.

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

**Success example:**

```json
{
  "success": true,
  "messageCode": "LIST_FETCHED",
  "message": "Resources fetched successfully",
  "data": {
    "data": [
      { "id": "uuid", "name": "John Doe", "email": "john@example.com", ... }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
  }
}
```

**Error example:**

```json
{
  "success": false,
  "messageCode": "NOT_FOUND",
  "message": "Resource not found",
  "errors": ["User not found"]
}
```

> See [ERROR_CODES.md](ERROR_CODES.md) for the complete message code reference.

---

## How Services Are Built

Each NestJS service follows a consistent bootstrap pattern:

```typescript
// main.ts
config({ path: join(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('my-service');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ContextInterceptor());

  // Swagger setup with server URL for portal compatibility
  const swaggerConfig = new DocumentBuilder()
    .setTitle('My Service')
    .addServer(`http://localhost:${port}`, 'Direct')
    .addBearerAuth()
    .build();

  await app.listen(port);
}
```

```typescript
// app.module.ts
@Module({
  imports: [
    DatabaseModule.forRoot({ connectionPrefix: 'MY_SERVICE' }),
    AuthModule,
    RealtimeModule,
    MyFeatureModule,
  ],
})
export class AppModule {}
```

**What each shared module provides:**

| Module | What it does |
|---|---|
| `DatabaseModule.forRoot()` | Knex connection pool, injected via `@InjectKnex()`. Accepts `connectionPrefix` for per-service DB connections (host, port, user, password, database). |
| `AuthModule` | Global `JwtAuthGuard` (Keycloak JWKS) + `RolesGuard`. Use `@Public()` to skip auth, `@Roles('admin')` for role checks. |
| `RealtimeModule` | Socket.IO WebSocket gateway with JWT-authenticated connections. Auto-broadcasts domain events. |
| `ContextInterceptor` | AsyncLocalStorage-based `RequestContext` (`userId`, `userEmail`, `roles`, `tenantId`, `requestId`). |
| `GlobalExceptionFilter` | Catches all exceptions and returns consistent `ApiResponse` error format via `MessageCatalog`. |
| `BaseRepository` | Generic Knex CRUD with pagination, search, auto audit fields (`createdBy`, `modifiedBy`), and domain event emission. |

---

## Real-Time Data Sync

When `RealtimeModule` is imported, Socket.IO is attached to the service's HTTP server. `BaseRepository` automatically emits domain events on create/update/delete, which are broadcast to subscribed WebSocket clients.

### Frontend Integration

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: '<access_token>' },
});

// Subscribe to all user changes
socket.emit('subscribe', { room: 'entity:users' });

// Listen for real-time updates
socket.on('data-changed', (event) => {
  console.log(event);
  // {
  //   entity: "users",
  //   action: "created" | "updated" | "deleted",
  //   entityId: "uuid",
  //   data: { ... },
  //   actor: "user-id",
  //   tenantId: "tenant-id",
  //   timestamp: "2026-03-04T..."
  // }
});

// Unsubscribe
socket.emit('unsubscribe', { room: 'entity:users' });
```

### Room Patterns

| Room | Receives |
|---|---|
| `entity:<table>` | All changes for a table (e.g., `entity:users`) |
| `entity:<table>:<id>` | Changes to a specific record |
| `tenant:<tenantId>` | All changes for a tenant |

---

## Scripts

| Command | Description |
|---|---|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build all libs and apps (Nx cached, dependency-aware) |
| `pnpm build:affected` | Build only changed projects |
| `pnpm start:all` | Start all services in parallel (via Nx) |
| `pnpm start:user` | Start user-service |
| `pnpm start:shared` | Start shared-db-example |
| `pnpm start:portal` | Start API Portal |
| `pnpm dev:user` | Run user-service directly (after build) |
| `pnpm dev:shared` | Run shared-db-example directly (after build) |
| `pnpm dev:portal` | Run API Portal directly (after build) |
| `pnpm migrate:user` | Run user-service DB migrations |
| `pnpm migrate:shared` | Run shared-db-example DB migrations |
| `pnpm test` | Run tests (Nx cached) |
| `pnpm lint` | Lint all projects (Nx cached) |
| `pnpm graph` | Open Nx dependency graph visualization |

---

## Documentation

| Document | Description |
|---|---|
| [PACKAGES.md](PACKAGES.md) | Shared libraries — all exports, usage examples, dependency graph |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Development guide — Clean Architecture, adding new services, coding conventions |
| [AUTHENTICATION.md](AUTHENTICATION.md) | Keycloak setup, OAuth 2.0 flows (ROPC, PKCE, Client Credentials), token management |
| [ERROR_CODES.md](ERROR_CODES.md) | Message codes, HTTP statuses, error response examples |
| [ARCHITECTURE-COMPARISON.md](ARCHITECTURE-COMPARISON.md) | Express → NestJS migration analysis & decision record |

---

## License

Private — CargoEz Platform
