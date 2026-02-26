# CargoEz Backend — Development Documentation

> Node.js microservices monorepo with PostgreSQL, Clean Architecture, and publishable shared packages.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [Package Dependency Graph](#3-package-dependency-graph)
4. [Clean Architecture Layers](#4-clean-architecture-layers)
5. [Prerequisites & Setup](#5-prerequisites--setup)
6. [Package Reference](#6-package-reference)
   - 6.1 [@rajkumarganesan93/domain](#61-rajkumarganesan93domain)
   - 6.2 [@rajkumarganesan93/application](#62-rajkumarganesan93application)
   - 6.3 [@rajkumarganesan93/api](#63-rajkumarganesan93api)
   - 6.4 [@rajkumarganesan93/infrastructure](#64-rajkumarganesan93infrastructure)
   - 6.5 [@rajkumarganesan93/shared](#65-rajkumarganesan93shared)
   - 6.6 [@rajkumarganesan93/integrations](#66-rajkumarganesan93integrations)
7. [Service Reference](#7-service-reference)
   - 7.1 [user-service](#71-user-service)
   - 7.2 [shared-db-example](#72-shared-db-example)
8. [Step-by-Step: Creating a New Service](#8-step-by-step-creating-a-new-service)
9. [API Flow Walkthrough — POST /users](#9-api-flow-walkthrough--post-users)
10. [API Response Format](#10-api-response-format)
11. [Error Handling](#11-error-handling)
12. [Message Catalog Reference](#12-message-catalog-reference)
13. [Database & Migrations](#13-database--migrations)
14. [Testing](#14-testing)
15. [Publishing Packages](#15-publishing-packages)
16. [Docker Compose](#16-docker-compose)
17. [Scripts Reference](#17-scripts-reference)
18. [Coding Rules & Conventions](#18-coding-rules--conventions)
19. [Authentication & Authorization (Keycloak)](#19-authentication--authorization-keycloak)
20. [API Portal (Global Swagger)](#20-api-portal-global-swagger)
21. [Error Codes Reference](#21-error-codes-reference)

---

## 1. Architecture Overview

```
cargoez2-backend/
├── packages/                       # Publishable @rajkumarganesan93/* npm packages
│   ├── domain/                     # BaseEntity, IRepository (9 methods), pagination, ColumnMap
│   ├── application/                # Entity mapper (toEntity/toRow), audit service, pino logger
│   ├── api/                        # MessageCode, MessageCatalog, response helpers
│   ├── infrastructure/             # BaseRepository (Knex), AppError classes, Express middleware
│   ├── shared/                     # getDbConfig, createKnex, asyncHandler, parsePaginationFromQuery
│   └── integrations/               # Email & notification provider interfaces + stubs
├── services/
│   ├── user-service/               # User CRUD APIs (port 3001, DB: user_service_db)
│   └── shared-db-example/          # Country CRUD APIs (port 3005, DB: master_db)
├── scripts/                        # DB init scripts for Docker
├── .npmrc                          # GitHub Packages registry config
├── docker-compose.yml              # Postgres + services orchestration
├── tsconfig.json                   # Root TypeScript config
└── package.json                    # npm workspaces root
```

**Tech stack:** Node.js >= 18.7.0 · TypeScript 5.x · Express 4 · PostgreSQL 16 · Knex.js · Pino · Jest · Docker Compose

---

## 2. Project Structure

Every service follows the same four-layer folder structure:

```
services/<service-name>/
├── src/
│   ├── domain/                     # Layer 1: Entities + repository interfaces
│   │   ├── entities/
│   │   │   └── User.ts
│   │   └── repositories/
│   │       └── IUserRepository.ts
│   ├── application/                # Layer 2: Use cases (business logic)
│   │   └── use-cases/
│   │       ├── CreateUserUseCase.ts
│   │       ├── GetAllUsersUseCase.ts
│   │       ├── GetUserByIdUseCase.ts
│   │       ├── UpdateUserUseCase.ts
│   │       └── DeleteUserUseCase.ts
│   ├── infrastructure/             # Layer 3: DB connection + repository implementations
│   │   ├── db.ts
│   │   └── repositories/
│   │       └── UserRepository.ts
│   └── presentation/               # Layer 4: Controllers, routes, Swagger
│       ├── controllers/
│       │   └── UserController.ts
│       ├── models/                # Zod schemas (validation + Swagger source of truth)
│       │   └── user.models.ts
│       ├── routes.ts
│       └── swagger.ts
├── migrations/                     # Incremental SQL migration scripts
├── tests/                          # Jest + Supertest integration tests
├── .env                            # Environment variables
├── package.json
├── tsconfig.json
└── run-migrations.ts               # Migration runner script
```

---

## 3. Package Dependency Graph

```
@rajkumarganesan93/domain           (no dependencies)
@rajkumarganesan93/api              → domain
@rajkumarganesan93/shared           → domain
@rajkumarganesan93/application      → domain
@rajkumarganesan93/infrastructure   → domain, application, api
@rajkumarganesan93/integrations     (no dependencies)
```

Build order must follow this dependency graph. The root `build:packages` script handles this automatically.

---

## 4. Clean Architecture Layers

| Layer | Folder | Responsibility | Allowed Dependencies |
|-------|--------|----------------|---------------------|
| **Domain** | `domain/` | Entity interfaces, repository interfaces | None (pure types) |
| **Application** | `application/` | Use cases, business rules | Domain only |
| **Infrastructure** | `infrastructure/` | DB connections, repository implementations, middleware | Domain, Application, Shared packages |
| **Presentation** | `presentation/` | Controllers, routes, Swagger, input validation | Application, Infrastructure, Shared packages |

**Key rules:**
- Domain layer has ZERO imports from other layers or frameworks.
- Use cases orchestrate domain logic. They receive repository interfaces via constructor injection.
- Infrastructure implements the repository interfaces defined in Domain.
- Presentation handles HTTP concerns (request parsing, validation, response formatting).

---

## 5. Prerequisites & Setup

### Requirements

- Node.js >= 18.7.0
- PostgreSQL (localhost:5432)
- npm (comes with Node.js)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/rajkumarganesan93/cargoez2-backend.git
cd cargoez2-backend

# Install all workspace dependencies
npm install
```

### Create Databases

```sql
CREATE DATABASE user_service_db;
CREATE DATABASE master_db;
```

### Configure Environment

Each service has a `.env` file under `services/<service>/`:

```env
# services/user-service/.env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=user_service_db
PORT=3001
```

```env
# services/shared-db-example/.env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=master_db
PORT=3005
```

### Build, Migrate & Run

```bash
# Build all packages and services
npm run build

# Run database migrations
npm run migrate:all

# Start services (each in a separate terminal)
npm run dev -w @cargoez-be/user-service
npm run dev -w @cargoez-be/shared-db-example
```

Optionally, start the **API Portal** (global Swagger UI with service dropdown):

```bash
npm run dev:portal
```

### Verify

| Service | Health Check | Swagger Docs | JSON Spec |
|---------|-------------|-------------|-----------|
| user-service | http://localhost:3001/health | http://localhost:3001/api-docs | http://localhost:3001/api-docs/json |
| shared-db-example | http://localhost:3005/health | http://localhost:3005/api-docs | http://localhost:3005/api-docs/json |
| **API Portal** | http://localhost:4000/health | http://localhost:4000 | -- |

The API Portal at `http://localhost:4000` provides a single Swagger UI with a dropdown to switch between all microservice APIs.

---

## 6. Package Reference

> **Quick reference:** See [PACKAGES.md](PACKAGES.md) for a concise index of all packages with exports, usage examples, and the dependency graph.

### 6.1 @rajkumarganesan93/domain

**Version:** 1.4.0 · **Dependencies:** none

Core domain types and interfaces. No business logic, no framework imports — pure TypeScript types only.

#### BaseEntity

Every domain entity must extend `BaseEntity`. Properties use **camelCase only**.

```typescript
export interface BaseEntity {
  id: string;            // UUID
  isActive: boolean;     // soft-delete flag
  createdAt: string;     // ISO 8601 string (not Date)
  modifiedAt: string;    // ISO 8601 string (not Date)
  createdBy?: string;
  modifiedBy?: string;
  tenantId?: string;
}
```

> Date fields are `string` (not `Date`) because database drivers and JSON serialization return ISO 8601 strings at runtime.

#### IRepository

Generic repository contract with **9 methods**. All service repositories must extend this.

```typescript
export interface IRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findAll(options?: ListOptions): Promise<PaginatedResult<T>>;
  findOne(criteria: Record<string, unknown>): Promise<T | null>;
  findMany(criteria: Record<string, unknown>, options?: ListOptions): Promise<PaginatedResult<T>>;
  save(input: CreateInput): Promise<T>;
  update(id: string, input: UpdateInput): Promise<T | null>;
  delete(id: string): Promise<boolean>;          // soft-delete (sets isActive=false)
  count(criteria?: Record<string, unknown>): Promise<number>;
  exists(criteria: Record<string, unknown>): Promise<boolean>;
}
```

| Method | Purpose |
|--------|---------|
| `findById` | Fetch by primary key (returns inactive records too) |
| `findAll` | Paginated list of **active** records only |
| `findOne` | First record matching criteria |
| `findMany` | Filtered paginated list |
| `save` | Create a new record |
| `update` | Update by ID (auto-sets `modifiedAt`) |
| `delete` | **Soft-delete** — sets `isActive=false`, does NOT remove the row |
| `count` | Count matching records (defaults to active only) |
| `exists` | Check if any record matches criteria |

**Important:** Do NOT create `findByEmail`, `findBySku`, or other bespoke finder methods. Use the generic `findOne({ email: '...' })` instead.

#### Pagination Types

```typescript
export interface PaginationRequest {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ListOptions {
  pagination?: PaginationRequest;
  filters?: Record<string, unknown>;
}
```

#### ColumnMap

Maps entity properties (camelCase) to database column names:

```typescript
export type ColumnMap = Record<string, string>;

// Example:
const userColumnMap: ColumnMap = {
  id: 'id',
  name: 'name',
  email: 'email',
  isActive: 'is_active',
  createdAt: 'created_at',
  modifiedAt: 'modified_at',
  createdBy: 'created_by',
  modifiedBy: 'modified_by',
  tenantId: 'tenant_id',
};
```

When no `ColumnMap` is provided, the `EntityMapper` defaults to automatic `snake_case` conversion (`createdAt` → `created_at`).

#### RequestEnvelope

Standard request wrapper for use cases:

```typescript
export interface RequestEnvelope<T = unknown> {
  tenantId?: string;
  requestId?: string;
  pagination?: PaginationRequest;
  filters?: Record<string, unknown>;
  body?: T;
}
```

#### API Response Types

```typescript
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  messageCode?: string;
  message?: string;
  data?: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  messageCode?: string;
  error: string;
  statusCode: number;
  timestamp: string;
  stack?: string;           // only in non-production
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
```

---

### 6.2 @rajkumarganesan93/application

**Version:** 1.1.0 · **Dependencies:** `domain`, `pino`

Application-layer utilities: entity-to-DB mapping, audit service, and structured logging.

#### Entity Mapper

Converts between DB rows (snake_case columns) and domain entities (camelCase properties).

```typescript
import { toEntity, toRow } from '@rajkumarganesan93/application';
import type { ColumnMap } from '@rajkumarganesan93/domain';

// DB row → Entity
const row = { id: '...', user_name: 'Alice', created_at: '2026-02-19T10:00:00Z' };
const map: ColumnMap = { name: 'user_name', createdAt: 'created_at' };
const entity = toEntity(row, map);
// → { id: '...', name: 'Alice', createdAt: '2026-02-19T10:00:00Z' }

// Entity → DB row
const dbRow = toRow(entity, map);
// → { id: '...', user_name: 'Alice', created_at: '2026-02-19T10:00:00Z' }
```

Without a `ColumnMap`, defaults to automatic snake_case ↔ camelCase conversion.

#### Logger (Pino)

```typescript
import { createLogger } from '@rajkumarganesan93/application';

const logger = createLogger('my-service');
logger.info({ userId: '123' }, 'User created');
logger.error({ err }, 'Failed to process request');
```

- JSON output in production
- Pretty-printed colored output in development (`NODE_ENV !== 'production'`)
- Log level configurable via `LOG_LEVEL` env var (default: `info`)

#### Audit Service

```typescript
import { AuditService, InMemoryAuditRepository } from '@rajkumarganesan93/application';

const auditRepo = new InMemoryAuditRepository();
const auditService = new AuditService(auditRepo);

await auditService.record({
  action: 'CREATE',
  entityType: 'User',
  entityId: '123',
  userId: 'admin-456',
  serviceName: 'user-service',
  metadata: { email: 'alice@example.com' },
});
```

`InMemoryAuditRepository` provides `getEntries()`, `findById()`, and `findByEntity()` for testing. For production, implement `IAuditRepository` with a database-backed store.

```typescript
export interface IAuditRepository {
  save(entry: Omit<AuditEntry, 'id'>): Promise<void>;
  findById?(id: string): Promise<AuditEntry | null>;
  findByEntity?(entityType: string, entityId: string): Promise<AuditEntry[]>;
}

export interface AuditEntry {
  id?: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  serviceName: string;
  ip?: string;
  userAgent?: string;
}
```

---

### 6.3 @rajkumarganesan93/api

**Version:** 1.4.0 · **Dependencies:** `domain`

API response builders, the centralized **Message Catalog**, and HTTP status constants.

#### HttpStatus Enum

Use `HttpStatus` instead of hardcoding numeric status codes:

```typescript
import { HttpStatus } from '@rajkumarganesan93/api';

res.status(HttpStatus.CREATED);   // 201
res.status(HttpStatus.NOT_FOUND); // 404
```

> In most cases you won't need `HttpStatus` directly because `sendSuccess()` and `sendError()` (from infrastructure) auto-resolve the status from the `MessageCode`.

#### Response Helpers (low-level)

```typescript
import { success, error, errorRaw, successPaginated, MessageCode } from '@rajkumarganesan93/api';

// These are the low-level builders. Prefer sendSuccess/sendError (infrastructure) in controllers.
success(user, MessageCode.CREATED, { resource: 'User' });
error(MessageCode.FIELD_REQUIRED, { field: 'email' });
successPaginated(result.items, result.meta, MessageCode.LIST_FETCHED, { resource: 'User' });
errorRaw('Request payload too large', 413);
```

#### resolveMessage

Resolves a `MessageCode` into its HTTP status and interpolated message:

```typescript
import { resolveMessage, MessageCode } from '@rajkumarganesan93/api';

const resolved = resolveMessage(MessageCode.DUPLICATE_EMAIL, { email: 'a@b.com' });
// → { messageCode: 'DUPLICATE_EMAIL', status: 409, message: 'Email a@b.com is already in use' }
```

- Uses `replaceAll` for safe placeholder replacement (no regex injection risk)
- Unreplaced `{placeholder}` tokens are automatically stripped

---

### 6.4 @rajkumarganesan93/infrastructure

**Version:** 1.8.0 · **Dependencies:** `domain`, `application`, `api`, `knex`, `zod`, `zod-to-json-schema`, `swagger-ui-express`, `dotenv`, `cors`, `jsonwebtoken`, `jwks-rsa` · **Peers:** `express`, `pino`

Express middleware, error classes (`ValidationError`, `BadRequestError`, `NotFoundError`, etc.), the generic `BaseRepository`, validation middleware, response helpers, Swagger utilities, and the service app factory.

#### BaseRepository

Implements all 9 `IRepository` methods using Knex.js. Service repositories extend it with zero raw SQL.

```typescript
import type { Knex } from 'knex';
import type { ColumnMap } from '@rajkumarganesan93/domain';
import { BaseRepository } from '@rajkumarganesan93/infrastructure';

const COLUMN_MAP: ColumnMap = {
  id: 'id', name: 'name', email: 'email',
  isActive: 'is_active', createdAt: 'created_at',
  modifiedAt: 'modified_at', createdBy: 'created_by',
  modifiedBy: 'modified_by', tenantId: 'tenant_id',
};

export class UserRepository
  extends BaseRepository<User, CreateUserInput, UpdateUserInput>
  implements IUserRepository
{
  constructor(knex: Knex) {
    super(knex, 'users', COLUMN_MAP, ['name', 'email']);
  }
}
```

**Constructor parameters:**

| Parameter | Type | Purpose |
|-----------|------|---------|
| `knex` | `Knex` | Knex instance from `createKnex()` |
| `table` | `string` | Database table name |
| `columnMap` | `ColumnMap` | Maps entity camelCase props to DB columns |
| `writableFields` | `string[]` | Entity props that users can set (create/update) |

**Key behaviors:**
- `delete()` performs a **soft-delete** — sets `is_active = false` and updates `modified_at`
- `findAll()` returns only **active** records (`is_active = true`)
- `findById()` returns any record including inactive (for admin lookups)
- `mapCriteria()` **throws** on unknown criteria keys to prevent silent empty queries from typos
- `update()` automatically sets `modified_at` to `NOW()`
- `save()` uses `INSERT ... RETURNING *` (PostgreSQL-specific)
- Limit is clamped between 1 and 100

**For complex queries** (JOINs, transactions), access the protected `this.knex` instance:

```typescript
export class OrderRepository extends BaseRepository<...> {
  async getOrdersWithItems(userId: string) {
    return this.knex('orders')
      .join('order_items', 'orders.id', 'order_items.order_id')
      .where('orders.user_id', userId)
      .select('orders.*', 'order_items.quantity');
  }
}
```

#### Error Classes

| Class | Status | Usage |
|-------|--------|-------|
| `AppError` | varies | Base class — do not throw directly |
| `BadRequestError` | 400 | Malformed request syntax (invalid JSON, wrong content-type) |
| `ValidationError` | 422 | Semantic validation failures (invalid email, missing fields, bad UUID) |
| `UnauthorizedError` | 401 | Authentication required |
| `ForbiddenError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Duplicate entry, conflict |

**400 vs 422:** Use `BadRequestError` (400) only for malformed request syntax. Use `ValidationError` (422) for semantic validation failures where the request is syntactically valid but the content doesn't pass validation.

All error classes accept either a `MessageCode` (recommended) or a plain string:

```typescript
import { NotFoundError, ConflictError, ValidationError } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';

// With MessageCode (recommended)
throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'User' });
// → 404: { messageCode: "NOT_FOUND", error: "User not found" }

throw new ConflictError(MessageCode.DUPLICATE_EMAIL, { email: 'a@b.com' });
// → 409: { messageCode: "DUPLICATE_EMAIL", error: "Email a@b.com is already in use" }

throw new ValidationError(MessageCode.INVALID_INPUT, { reason: 'id must be a valid UUID' });
// → 422: { messageCode: "INVALID_INPUT", error: "Invalid input: id must be a valid UUID" }

// With plain string (escape hatch)
throw new ValidationError('Custom validation message');
// → 422: { error: "Custom validation message" } (no messageCode)
```

#### errorHandler Middleware

```typescript
import { errorHandler, NotFoundError } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';

// 404 catch-all (after all routes)
app.use((_req, _res, next) => next(new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Route' })));

// Error handler (must be last middleware)
app.use(errorHandler({ logger }));
```

**Behavior:**
- **JSON parse errors** → 400 with `messageCode: BAD_REQUEST`
- **Validation errors** → 422 with `messageCode: VALIDATION_FAILED` or `INVALID_INPUT`
- **PayloadTooLarge** → 413
- **PostgreSQL unique violations** → 409 with `messageCode: DUPLICATE_ENTRY`
- **AppError with MessageCode** → structured response with `messageCode` + resolved message
- **AppError without MessageCode (client, <500)** → raw error message
- **AppError without MessageCode (server, >=500)** → generic `INTERNAL_ERROR` (prevents message leakage)
- **Unrecognized errors** → `INTERNAL_ERROR`
- Stack traces included only when `NODE_ENV !== 'production'`

#### requestLogger Middleware

```typescript
import { requestLogger } from '@rajkumarganesan93/infrastructure';

app.use(requestLogger(logger));
```

Logs every HTTP request with method, path, status, and duration. Also logs client-aborted requests.

#### Validation Middleware (Zod-based Model Binding)

Validates `req.body`, `req.params`, or `req.query` against a Zod schema. Parsed and transformed data is attached to `req.validated`. On failure, throws a `ValidationError` (HTTP 422) with combined error messages.

```typescript
import { validateBody, validateParams, validateQuery } from '@rajkumarganesan93/infrastructure';
import type { ValidatedRequest } from '@rajkumarganesan93/infrastructure';

// In routes — declarative validation:
router.post('/users', validateBody(CreateUserBody), asyncHandler(controller.create));
router.get('/users/:id', validateParams(IdParams), asyncHandler(controller.getById));

// In controller — typed request, zero manual validation:
create = async (req: ValidatedRequest<CreateUserBody>, res: Response): Promise<Response> => {
  const { name, email } = req.validated.body; // fully typed, trimmed, lowercased
  const user = await this.createUserUseCase.execute({ name, email });
  return sendSuccess(res, user, MessageCode.CREATED, { resource: 'User' });
};

getById = async (req: ValidatedRequest<unknown, IdParams>, res: Response): Promise<Response> => {
  const { id } = req.validated.params; // validated UUID
  // ...
};
```

**ValidatedRequest** type parameters: `ValidatedRequest<TBody, TParams, TQuery>`

#### Response Helpers (sendSuccess / sendError / sendPaginated)

Auto-resolve HTTP status from `MessageCode` so controllers never hardcode status numbers:

```typescript
import { sendSuccess, sendError, sendPaginated } from '@rajkumarganesan93/infrastructure';

// Success — HTTP status auto-resolved from MessageCode
return sendSuccess(res, user, MessageCode.CREATED, { resource: 'User' });
// → 201: { success: true, messageCode: "CREATED", message: "User created successfully", data: {...} }

// Error — HTTP status auto-resolved from MessageCode
return sendError(res, MessageCode.FIELD_REQUIRED, { field: 'email' });
// → 422: { success: false, messageCode: "FIELD_REQUIRED", error: "email is required" }

// Paginated — HTTP status auto-resolved from MessageCode
return sendPaginated(res, result.items, result.meta, MessageCode.LIST_FETCHED, { resource: 'User' });
// → 200: { success: true, data: { items: [...], meta: {...} } }
```

#### createServiceApp Factory

Eliminates boilerplate in every service's `index.ts`. Handles: JSON parsing, request logging, Swagger UI, health check, 404 catch-all, error handler, and graceful shutdown.

```typescript
import { createServiceApp } from '@rajkumarganesan93/infrastructure';

const { start } = createServiceApp({
  serviceName: 'user-service',
  port: process.env.PORT ?? 3001,
  swaggerSpec,
  // Auth is auto-detected from KEYCLOAK_ISSUER env var after dotenv loads.
  // Set auth: false to explicitly disable, even when env var is present.
  routes: (app) => app.use(createUserRoutes(controller)),
  onShutdown: () => knex.destroy(),
});

start();
```

**ServiceAppConfig:**

| Property | Type | Purpose |
|----------|------|---------|
| `serviceName` | `string` | Used for logging |
| `port` | `number \| string` | HTTP port |
| `swaggerSpec` | `object?` | OpenAPI spec (served at `/api-docs` and `/api-docs/json`) |
| `auth` | `AuthConfig \| false?` | Auto-detected from `KEYCLOAK_ISSUER` env var. Pass explicit config or `false` to disable. See [Section 19](#19-authentication--authorization-keycloak) |
| `routes` | `(app: Express) => void` | Mount routes |
| `onShutdown` | `() => Promise<void>?` | Cleanup (close DB, etc.) |

**Built-in middleware:** `cors()`, `express.json()`, `requestLogger`, JWT auth (auto-detected from `KEYCLOAK_ISSUER`), `errorHandler`, graceful shutdown

**Built-in endpoints:** `/health`, `/api-docs` (Swagger UI), `/api-docs/json` (raw JSON spec — consumed by the API Portal)

#### Swagger Helpers

Auto-generate OpenAPI schemas from Zod models:

```typescript
import {
  zodToSwagger,
  SwaggerSuccessResponse,
  SwaggerErrorResponse,
  SwaggerPaginationMeta,
  SwaggerPaginationParams,
} from '@rajkumarganesan93/infrastructure';

// Generate OpenAPI schema from a Zod model
const UserSchema = zodToSwagger(UserResponse);
const CreateUserInputSchema = zodToSwagger(CreateUserBody);

// Use pre-built common schemas
components: {
  schemas: {
    User: UserSchema,
    CreateUserInput: CreateUserInputSchema,
    PaginationMeta: SwaggerPaginationMeta,
    SuccessResponse: SwaggerSuccessResponse,
    ErrorResponse: SwaggerErrorResponse,
  },
},

// Use pre-built pagination query parameters
parameters: SwaggerPaginationParams,

// Security scheme for JWT Bearer auth
import {
  SwaggerBearerAuth,
  SwaggerSecurityRequirement,
  SwaggerAuthResponses,
} from '@rajkumarganesan93/infrastructure';

components: {
  securitySchemes: { BearerAuth: SwaggerBearerAuth },
},
security: [SwaggerSecurityRequirement],

// Add 401/403 responses to protected endpoints
responses: {
  '200': { ... },
  ...SwaggerAuthResponses,  // adds 401 + 403
},
```

#### Authentication Middleware

JWT Bearer token validation using JWKS key discovery. Works with Keycloak or any OIDC provider.

```typescript
import { createAuthMiddleware, authorize } from '@rajkumarganesan93/infrastructure';
import type { AuthenticatedRequest, AuthUser } from '@rajkumarganesan93/infrastructure';

// Automatically mounted by createServiceApp when auth config is provided.
// For manual usage:
app.use(createAuthMiddleware({
  issuer: 'http://localhost:8080/realms/cargoez',
  audience: 'cargoez-api',
  publicPaths: ['/health', '/api-docs'],  // defaults
}));

// Role-based access control on routes:
router.post('/users', authorize('admin'), validateBody(CreateUserBody), handler);
router.put('/users/:id', authorize('admin', 'manager'), handler);

// Access authenticated user in controllers:
const user = (req as AuthenticatedRequest).user;
console.log(user.sub, user.email, user.realmRoles);
```

**AuthUser properties:**

| Property | Type | Description |
|----------|------|-------------|
| `sub` | `string` | Keycloak user ID |
| `email` | `string?` | User email |
| `preferredUsername` | `string?` | Username |
| `name` | `string?` | Full name |
| `realmRoles` | `string[]` | Roles from `realm_access.roles` |
| `resourceRoles` | `string[]` | Roles from `resource_access.<client>.roles` |
| `tokenPayload` | `Record<string, unknown>` | Full decoded JWT payload |

---

### 6.5 @rajkumarganesan93/shared

**Version:** 1.4.0 · **Dependencies:** `domain`, `knex` · **Peers:** `express`

Minimal shared utilities.

#### Database Connection

```typescript
import { createKnex } from '@rajkumarganesan93/shared';
import type { Knex } from '@rajkumarganesan93/shared';

let _knex: Knex | undefined;

export function getKnex(): Knex {
  if (!_knex) _knex = createKnex();
  return _knex;
}
```

`createKnex()` reads from standard env vars:

| Env Var | Default | Required |
|---------|---------|----------|
| `DB_HOST` | `localhost` | No |
| `DB_PORT` | `5432` | No (must be a number) |
| `DB_USER` | — | **Yes** (throws if missing) |
| `DB_PASSWORD` | — | **Yes** (throws if missing) |
| `DB_NAME` | — | **Yes** (throws if missing) |

Connection pool: `min: 2, max: 10`.

#### asyncHandler

Wraps async Express handlers so thrown errors propagate to `errorHandler`:

```typescript
import { asyncHandler } from '@rajkumarganesan93/shared';

router.get('/users', asyncHandler(controller.getAll.bind(controller)));
router.post('/users', asyncHandler(controller.create.bind(controller)));
```

#### parsePaginationFromQuery

Parses and validates pagination from Express query strings:

```typescript
import { parsePaginationFromQuery } from '@rajkumarganesan93/shared';

const pagination = parsePaginationFromQuery(req.query, {
  defaultLimit: 20,
  maxLimit: 100,
  defaultSortBy: 'createdAt',
  defaultSortOrder: 'asc',
  allowedSortFields: ['name', 'email', 'createdAt', 'modifiedAt'],
});
```

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `defaultPage` | `number` | `1` | Starting page when `?page` is omitted |
| `defaultLimit` | `number` | `20` | Items per page when `?limit` is omitted |
| `maxLimit` | `number` | `100` | Maximum allowed limit (values above are clamped) |
| `defaultSortBy` | `string` | `'createdAt'` | Sort field when `?sortBy` is omitted |
| `defaultSortOrder` | `'asc' \| 'desc'` | `'asc'` | Sort direction when `?sortOrder` is omitted |
| `allowedSortFields` | `string[]` | (none) | Whitelist of allowed sort fields |

#### getConfig

```typescript
import { getConfig } from '@rajkumarganesan93/shared';

const port = getConfig('PORT', '3001');   // returns string | undefined
const secret = getConfig('JWT_SECRET');
```

Always returns `string | undefined`. Callers must parse/convert as needed.

---

### 6.6 @rajkumarganesan93/integrations

**Version:** 1.1.0 · **Dependencies:** none

Interfaces and stubs for third-party integrations.

#### Email Provider

```typescript
import type { IEmailProvider, EmailMessage } from '@rajkumarganesan93/integrations';
import { StubEmailProvider } from '@rajkumarganesan93/integrations';

const emailProvider: IEmailProvider = new StubEmailProvider();

await emailProvider.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  body: '<h1>Welcome to CargoEz</h1>',
});
```

```typescript
export interface EmailMessage {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

export interface IEmailProvider {
  send(message: EmailMessage): Promise<void>;
}
```

#### Notification Provider

`NotificationPayload` is a **discriminated union** — at least one destination (`userId`, `deviceToken`, or `topic`) is required:

```typescript
import type { INotificationProvider, NotificationPayload } from '@rajkumarganesan93/integrations';
import { StubNotificationProvider } from '@rajkumarganesan93/integrations';

const notifier: INotificationProvider = new StubNotificationProvider();

await notifier.send({
  userId: 'user-123',       // at least one destination required
  title: 'Order shipped',
  body: 'Your order #456 has been shipped.',
});
```

```typescript
export type NotificationPayload =
  | NotificationToUser     // requires userId
  | NotificationToDevice   // requires deviceToken
  | NotificationToTopic;   // requires topic

export interface INotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}
```

---

## 7. Service Reference

### 7.1 user-service

| Property | Value |
|----------|-------|
| Port | 3001 |
| Database | `user_service_db` |
| Base URL | `http://localhost:3001` |
| Swagger | `http://localhost:3001/api-docs` |

**Endpoints:**

| Method | Path | Description | MessageCode |
|--------|------|-------------|-------------|
| `GET` | `/health` | Health check | — |
| `POST` | `/users` | Create user | `CREATED` |
| `GET` | `/users` | List users (paginated) | `LIST_FETCHED` |
| `GET` | `/users/:id` | Get user by ID | `FETCHED` |
| `PUT` | `/users/:id` | Update user | `UPDATED` |
| `DELETE` | `/users/:id` | Soft-delete user | `DELETED` |

**Pagination query params:** `?page=1&limit=20&sortBy=name&sortOrder=asc`

**Entity:**

```typescript
import type { BaseEntity } from '@rajkumarganesan93/domain';

export interface User extends BaseEntity {
  name: string;      // max 100 chars
  email: string;     // max 150 chars, unique, validated format
}
```

**Input validation (Zod middleware):**
- UUID format validation on path params (via `validateParams(IdParams)`)
- Email format validation (via `validateBody(CreateUserBody)`)
- Name max length: 100 characters
- Email max length: 150 characters
- Input strings are automatically trimmed; emails are automatically lowercased
- Validation errors return `VALIDATION_FAILED` with combined error messages

### 7.2 shared-db-example

| Property | Value |
|----------|-------|
| Port | 3005 |
| Database | `master_db` (shared database) |
| Base URL | `http://localhost:3005` |
| Swagger | `http://localhost:3005/api-docs` |

Same CRUD pattern as user-service but for a `Country` entity with code/name fields.

---

## 8. Step-by-Step: Creating a New Service

This guide walks through creating a `product-service` from scratch.

### Step 1: Create the folder structure

```
services/product-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Product.ts
│   │   └── repositories/
│   │       └── IProductRepository.ts
│   ├── application/
│   │   └── use-cases/
│   │       ├── CreateProductUseCase.ts
│   │       ├── GetAllProductsUseCase.ts
│   │       ├── GetProductByIdUseCase.ts
│   │       ├── UpdateProductUseCase.ts
│   │       └── DeleteProductUseCase.ts
│   ├── infrastructure/
│   │   ├── db.ts
│   │   └── repositories/
│   │       └── ProductRepository.ts
│   └── presentation/
│       ├── controllers/
│       │   └── ProductController.ts
│       ├── routes.ts
│       └── swagger.ts
├── migrations/
│   └── 001_init.sql
├── tests/
│   └── product.test.ts
├── .env
├── package.json
├── tsconfig.json
└── run-migrations.ts
```

### Step 2: Define the entity

```typescript
// src/domain/entities/Product.ts
import type { BaseEntity } from '@rajkumarganesan93/domain';

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  price: number;
}
```

### Step 3: Define the repository interface

**Must** extend `IRepository`. No bespoke `findByX` methods.

```typescript
// src/domain/repositories/IProductRepository.ts
import type { IRepository } from '@rajkumarganesan93/domain';
import type { Product } from '../entities/Product.js';

export interface CreateProductInput { name: string; sku: string; price: number; }
export interface UpdateProductInput { name?: string; price?: number; }

export interface IProductRepository extends IRepository<Product, CreateProductInput, UpdateProductInput> {}
```

### Step 4: Implement the repository

Extend `BaseRepository` — zero raw SQL needed:

```typescript
// src/infrastructure/repositories/ProductRepository.ts
import type { Knex } from 'knex';
import type { ColumnMap } from '@rajkumarganesan93/domain';
import { BaseRepository } from '@rajkumarganesan93/infrastructure';
import type { IProductRepository, CreateProductInput, UpdateProductInput } from '../../domain/repositories/IProductRepository.js';
import type { Product } from '../../domain/entities/Product.js';

const COLUMN_MAP: ColumnMap = {
  id: 'id', name: 'name', sku: 'sku', price: 'price',
  isActive: 'is_active', createdAt: 'created_at', modifiedAt: 'modified_at',
  createdBy: 'created_by', modifiedBy: 'modified_by', tenantId: 'tenant_id',
};

export class ProductRepository
  extends BaseRepository<Product, CreateProductInput, UpdateProductInput>
  implements IProductRepository
{
  constructor(knex: Knex) {
    super(knex, 'products', COLUMN_MAP, ['name', 'sku', 'price']);
  }
}
```

### Step 5: Create the database connection

```typescript
// src/infrastructure/db.ts
import { createKnex } from '@rajkumarganesan93/shared';
import type { Knex } from 'knex';

let _knex: Knex | undefined;

export function getKnex(): Knex {
  if (!_knex) _knex = createKnex();
  return _knex;
}
```

### Step 6: Create use cases

One class per use case. Use `findOne` instead of domain-specific finders.

```typescript
// src/application/use-cases/CreateProductUseCase.ts
import { ConflictError } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';
import type { IProductRepository, CreateProductInput } from '../../domain/repositories/IProductRepository.js';
import type { Product } from '../../domain/entities/Product.js';

export class CreateProductUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const existing = await this.repo.findOne({ sku: input.sku });
    if (existing) {
      throw new ConflictError(MessageCode.DUPLICATE_ENTRY, { resource: 'Product', field: 'SKU' });
    }
    return this.repo.save(input);
  }
}
```

```typescript
// src/application/use-cases/GetAllProductsUseCase.ts
import type { PaginatedResult, ListOptions } from '@rajkumarganesan93/domain';
import type { Product } from '../../domain/entities/Product.js';
import type { IProductRepository } from '../../domain/repositories/IProductRepository.js';

export class GetAllProductsUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(options?: ListOptions): Promise<PaginatedResult<Product>> {
    return this.repo.findAll(options);
  }
}
```

```typescript
// src/application/use-cases/GetProductByIdUseCase.ts
import type { IProductRepository } from '../../domain/repositories/IProductRepository.js';
import type { Product } from '../../domain/entities/Product.js';

export class GetProductByIdUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(id: string): Promise<Product | null> {
    return this.repo.findById(id);
  }
}
```

```typescript
// src/application/use-cases/UpdateProductUseCase.ts
import type { IProductRepository, UpdateProductInput } from '../../domain/repositories/IProductRepository.js';
import type { Product } from '../../domain/entities/Product.js';

export class UpdateProductUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(id: string, input: UpdateProductInput): Promise<Product | null> {
    return this.repo.update(id, input);
  }
}
```

```typescript
// src/application/use-cases/DeleteProductUseCase.ts
import type { IProductRepository } from '../../domain/repositories/IProductRepository.js';

export class DeleteProductUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}
```

### Step 7: Define Zod models

Create request/response schemas in `src/presentation/models/`. This is the single source of truth for validation and Swagger.

```typescript
// src/presentation/models/product.models.ts
import { z } from 'zod';

export const CreateProductBody = z.object({
  name: z.string().trim().min(1, 'name is required').max(100),
  sku: z.string().trim().toUpperCase().min(1, 'sku is required').max(50),
  price: z.number().min(0, 'price must be non-negative'),
});
export type CreateProductBody = z.infer<typeof CreateProductBody>;

export const UpdateProductBody = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  price: z.number().min(0).optional(),
}).refine((data) => data.name !== undefined || data.price !== undefined, {
  message: 'At least one of name or price is required',
});
export type UpdateProductBody = z.infer<typeof UpdateProductBody>;

export const IdParams = z.object({
  id: z.string().refine(
    (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    { message: 'id must be a valid UUID' },
  ),
});
export type IdParams = z.infer<typeof IdParams>;

export const ProductResponse = z.object({
  id: z.string(), name: z.string(), sku: z.string(), price: z.number(),
  isActive: z.boolean(), createdAt: z.string(), modifiedAt: z.string(),
});
export type ProductResponse = z.infer<typeof ProductResponse>;
```

### Step 8: Create the controller

No manual validation — all validation is done by middleware. Use `ValidatedRequest` for typed access, `sendSuccess`/`sendPaginated` for auto-status responses.

```typescript
// src/presentation/controllers/ProductController.ts
import type { Response } from 'express';
import type { ValidatedRequest } from '@rajkumarganesan93/infrastructure';
import { NotFoundError, sendSuccess, sendPaginated } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';
import { parsePaginationFromQuery } from '@rajkumarganesan93/shared';
import type { CreateProductBody, UpdateProductBody, IdParams } from '../models/product.models.js';
import { CreateProductUseCase } from '../../application/use-cases/CreateProductUseCase.js';
import { GetAllProductsUseCase } from '../../application/use-cases/GetAllProductsUseCase.js';
import { GetProductByIdUseCase } from '../../application/use-cases/GetProductByIdUseCase.js';
import { UpdateProductUseCase } from '../../application/use-cases/UpdateProductUseCase.js';
import { DeleteProductUseCase } from '../../application/use-cases/DeleteProductUseCase.js';

const ALLOWED_SORT_FIELDS = ['name', 'sku', 'price', 'createdAt', 'modifiedAt'];

export class ProductController {
  constructor(
    private readonly createUseCase: CreateProductUseCase,
    private readonly getAllUseCase: GetAllProductsUseCase,
    private readonly getByIdUseCase: GetProductByIdUseCase,
    private readonly updateUseCase: UpdateProductUseCase,
    private readonly deleteUseCase: DeleteProductUseCase,
  ) {}

  create = async (req: ValidatedRequest<CreateProductBody>, res: Response): Promise<Response> => {
    const product = await this.createUseCase.execute(req.validated.body);
    return sendSuccess(res, product, MessageCode.CREATED, { resource: 'Product' });
  };

  getAll = async (req: ValidatedRequest, res: Response): Promise<Response> => {
    const pagination = parsePaginationFromQuery(req.query as Record<string, unknown>, {
      allowedSortFields: ALLOWED_SORT_FIELDS,
    });
    const result = await this.getAllUseCase.execute({ pagination });
    return sendPaginated(res, result.items, result.meta, MessageCode.LIST_FETCHED, { resource: 'Product' });
  };

  getById = async (req: ValidatedRequest<unknown, IdParams>, res: Response): Promise<Response> => {
    const product = await this.getByIdUseCase.execute(req.validated.params.id);
    if (!product) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Product' });
    return sendSuccess(res, product, MessageCode.FETCHED, { resource: 'Product' });
  };

  update = async (req: ValidatedRequest<UpdateProductBody, IdParams>, res: Response): Promise<Response> => {
    const product = await this.updateUseCase.execute(req.validated.params.id, req.validated.body);
    if (!product) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Product' });
    return sendSuccess(res, product, MessageCode.UPDATED, { resource: 'Product' });
  };

  delete = async (req: ValidatedRequest<unknown, IdParams>, res: Response): Promise<Response> => {
    const deleted = await this.deleteUseCase.execute(req.validated.params.id);
    if (!deleted) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Product' });
    return sendSuccess(res, undefined, MessageCode.DELETED, { resource: 'Product' });
  };
}
```

### Step 9: Create routes

Attach validation middleware — no manual validation in routes:

```typescript
// src/presentation/routes.ts
import { Router } from 'express';
import { asyncHandler } from '@rajkumarganesan93/shared';
import { validateBody, validateParams } from '@rajkumarganesan93/infrastructure';
import { CreateProductBody, UpdateProductBody, IdParams } from './models/product.models.js';
import type { ProductController } from './controllers/ProductController.js';

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  router.post('/products', validateBody(CreateProductBody), asyncHandler(controller.create));
  router.get('/products', asyncHandler(controller.getAll));
  router.get('/products/:id', validateParams(IdParams), asyncHandler(controller.getById));
  router.put('/products/:id', validateParams(IdParams), validateBody(UpdateProductBody), asyncHandler(controller.update));
  router.delete('/products/:id', validateParams(IdParams), asyncHandler(controller.delete));

  return router;
}
```

### Step 10: Create the entry point

Use `createServiceApp` — no manual boilerplate:

```typescript
// src/index.ts
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import { createServiceApp } from '@rajkumarganesan93/infrastructure';
import { swaggerSpec } from './presentation/swagger.js';
import { createProductRoutes } from './presentation/routes.js';
import { ProductController } from './presentation/controllers/ProductController.js';
import { ProductRepository } from './infrastructure/repositories/ProductRepository.js';
import { getKnex } from './infrastructure/db.js';
import { CreateProductUseCase } from './application/use-cases/CreateProductUseCase.js';
import { GetAllProductsUseCase } from './application/use-cases/GetAllProductsUseCase.js';
import { GetProductByIdUseCase } from './application/use-cases/GetProductByIdUseCase.js';
import { UpdateProductUseCase } from './application/use-cases/UpdateProductUseCase.js';
import { DeleteProductUseCase } from './application/use-cases/DeleteProductUseCase.js';

const knex = getKnex();
const repo = new ProductRepository(knex);
const controller = new ProductController(
  new CreateProductUseCase(repo),
  new GetAllProductsUseCase(repo),
  new GetProductByIdUseCase(repo),
  new UpdateProductUseCase(repo),
  new DeleteProductUseCase(repo),
);

const { start } = createServiceApp({
  serviceName: 'product-service',
  port: process.env.PORT ?? 3002,
  swaggerSpec,
  routes: (app) => app.use(createProductRoutes(controller)),
  onShutdown: () => knex.destroy(),
});

start();
```

### Step 11: Create the migration

All tables **must** include BaseEntity columns:

```sql
-- migrations/001_init.sql
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    modified_by VARCHAR(100),
    tenant_id VARCHAR(100)
);
```

### Step 12: Create package.json

```json
{
  "name": "@cargoez-be/product-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "npx jest",
    "migrate": "node dist/run-migrations.js"
  },
  "dependencies": {
    "@rajkumarganesan93/api": "*",
    "@rajkumarganesan93/application": "*",
    "@rajkumarganesan93/domain": "*",
    "@rajkumarganesan93/infrastructure": "*",
    "@rajkumarganesan93/shared": "*",
    "dotenv": "^16.4.5",
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.16",
    "tsx": "^4.21.0",
    "typescript": "^5.3.3"
  }
}
```

### Step 13: Register in root package.json

Add `"services/product-service"` to the `workspaces` array, then run `npm install`.

### Step 14: Build, migrate, run

```bash
npm run build
npm run migrate -w @cargoez-be/product-service
npm run dev -w @cargoez-be/product-service
```

---

## 9. API Flow Walkthrough — POST /users

Here is how a single `POST /users` request flows through the architecture:

```
Client → Express → requestLogger → routes → validateBody(CreateUserBody) → asyncHandler → Controller → Use Case → Repository → DB
                                                    ↓ (on validation fail)                                                         ↓
                                        ValidationError(VALIDATION_FAILED) → 422                                                   ↓
                                                    ↓                                                                              ↓
Client ← Express ← errorHandler (if error) ← ← ← ← ← ← ← ← ← ← ← ← Controller ← Use Case ← Repository ← DB result
```

**Step-by-step:**

1. **Client** sends `POST http://localhost:3001/users` with body `{ "name": "  Alice  ", "email": "ALICE@example.com" }`.

2. **`express.json()`** parses the request body.

3. **`requestLogger`** records the start time, logs `POST /users 201 42ms` on finish.

4. **`routes.ts`** matches `POST /users` → runs `validateBody(CreateUserBody)` middleware first.

5. **`validateBody(CreateUserBody)`** middleware:
   - Parses body against Zod schema → trims `name` to `"Alice"`, lowercases email to `"alice@example.com"`
   - If validation fails → throws `ValidationError(VALIDATION_FAILED, { reason: "..." })` → caught by `errorHandler` → 422
   - On success → attaches parsed result to `req.validated.body`

6. **`asyncHandler`** wraps the controller call in a try/catch. If the controller throws, the error is forwarded to `errorHandler`.

7. **`UserController.create`**:
   - Accesses `req.validated.body` (already validated, trimmed, lowercased)
   - Calls `createUserUseCase.execute(req.validated.body)`

8. **`CreateUserUseCase.execute`**:
   - Calls `this.userRepository.findOne({ email: input.email })` to check for duplicates
   - If duplicate found → throws `ConflictError(MessageCode.DUPLICATE_EMAIL, { email })`
   - If no duplicate → calls `this.userRepository.save(input)`

9. **`UserRepository.save`** (inherits from `BaseRepository`):
   - `mapInput()` filters to writable fields (`name`, `email`) and maps to DB columns
   - Executes `INSERT INTO users (name, email) VALUES (...) RETURNING *`
   - `rowToEntity()` converts the DB row back to a `User` entity using `toEntity(row, COLUMN_MAP)`

10. **Back in the controller**:
    - Calls `sendSuccess(res, user, MessageCode.CREATED, { resource: 'User' })`
    - `sendSuccess` auto-resolves HTTP 201 from `MessageCatalog[CREATED].status`

11. **`success()` helper** (called internally by `sendSuccess`) calls `resolveMessage(MessageCode.CREATED, { resource: 'User' })` which:
    - Looks up `CREATED` in `MessageCatalog` → `{ status: 201, message: '{resource} created successfully' }`
    - Replaces `{resource}` with `'User'` → `'User created successfully'`
    - Returns the final JSON envelope

12. **Response sent to client:**

```json
{
  "success": true,
  "messageCode": "CREATED",
  "message": "User created successfully",
  "data": {
    "id": "a1b2c3d4-...",
    "name": "Alice",
    "email": "alice@example.com",
    "isActive": true,
    "createdAt": "2026-02-19T10:00:00.000Z",
    "modifiedAt": "2026-02-19T10:00:00.000Z"
  },
  "timestamp": "2026-02-19T10:00:00.123Z"
}
```

**If an error occurs at any step**, `asyncHandler` catches it and passes it to `errorHandler`, which logs the error and returns a structured JSON error response.

---

## 10. API Response Format

All APIs return a consistent JSON envelope:

### Success

```json
{
  "success": true,
  "messageCode": "CREATED",
  "message": "User created successfully",
  "data": { "id": "...", "name": "...", "email": "...", "isActive": true, "createdAt": "...", "modifiedAt": "..." },
  "timestamp": "2026-02-19T10:00:00.000Z"
}
```

### Paginated Success

```json
{
  "success": true,
  "messageCode": "LIST_FETCHED",
  "message": "User list fetched successfully",
  "data": {
    "items": [ { "id": "...", "name": "...", "email": "...", "isActive": true, "createdAt": "...", "modifiedAt": "..." } ],
    "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
  },
  "timestamp": "2026-02-19T10:00:00.000Z"
}
```

### Error

```json
{
  "success": false,
  "messageCode": "NOT_FOUND",
  "error": "User not found",
  "statusCode": 404,
  "timestamp": "2026-02-19T10:00:00.000Z"
}
```

---

## 11. Error Handling

### Error Flow

```
Controller throws → asyncHandler catches → errorHandler middleware → JSON response
```

### Error Class Selection Guide

| Scenario | Error Class | MessageCode | HTTP Status |
|----------|------------|-------------|-------------|
| Malformed JSON | `BadRequestError` | `BAD_REQUEST` | 400 |
| Missing required field | `ValidationError` | `FIELD_REQUIRED` | 422 |
| Invalid input format | `ValidationError` | `INVALID_INPUT` | 422 |
| Schema validation failure | `ValidationError` | `VALIDATION_FAILED` | 422 |
| Not authenticated | `UnauthorizedError` | `UNAUTHORIZED` | 401 |
| No permission | `ForbiddenError` | `FORBIDDEN` | 403 |
| Resource not found | `NotFoundError` | `NOT_FOUND` | 404 |
| Duplicate entry | `ConflictError` | `DUPLICATE_ENTRY` | 409 |
| Duplicate email | `ConflictError` | `DUPLICATE_EMAIL` | 409 |

### Best Practices

1. **Always use `MessageCode`** — never pass raw strings to error classes
2. **Use `{reason}` placeholder** with `INVALID_INPUT` and `BAD_REQUEST`
3. **Use `{resource}` placeholder** with `NOT_FOUND`, `CREATED`, `UPDATED`, `DELETED`
4. **Use `{field}` placeholder** with `FIELD_REQUIRED`, `DUPLICATE_ENTRY`
5. **Throw errors, don't catch them** — let `asyncHandler` + `errorHandler` handle the response
6. **Validation in controllers** — use cases should throw domain errors; controllers handle input validation

---

## 12. Message Catalog Reference

| Code | Status | Message Template | Placeholders |
|------|--------|-----------------|-------------|
| `CREATED` | 201 | `{resource} created successfully` | `resource` |
| `UPDATED` | 200 | `{resource} updated successfully` | `resource` |
| `DELETED` | 200 | `{resource} deleted successfully` | `resource` |
| `FETCHED` | 200 | `{resource} fetched successfully` | `resource` |
| `LIST_FETCHED` | 200 | `{resource} list fetched successfully` | `resource` |
| `BAD_REQUEST` | 400 | `Bad request: {reason}` | `reason` |
| `VALIDATION_FAILED` | 422 | `Validation failed: {reason}` | `reason` |
| `FIELD_REQUIRED` | 422 | `{field} is required` | `field` |
| `INVALID_INPUT` | 422 | `Invalid input: {reason}` | `reason` |
| `UNAUTHORIZED` | 401 | `Authentication required` | — |
| `FORBIDDEN` | 403 | `You do not have permission to perform this action` | — |
| `INVALID_CREDENTIALS` | 401 | `Invalid credentials` | — |
| `TOKEN_EXPIRED` | 401 | `Token has expired` | — |
| `NOT_FOUND` | 404 | `{resource} not found` | `resource` |
| `CONFLICT` | 409 | `{resource} already exists` | `resource` |
| `DUPLICATE_ENTRY` | 409 | `{resource} with this {field} already exists` | `resource`, `field` |
| `DUPLICATE_EMAIL` | 409 | `Email {email} is already in use` | `email` |
| `INTERNAL_ERROR` | 500 | `An unexpected error occurred` | — |
| `SERVICE_UNAVAILABLE` | 503 | `Service is temporarily unavailable` | — |

**Rules:**
- Developers must ONLY use `MessageCode` enum values — never raw strings
- New codes should only be added to the catalog by the core/platform team
- Unreplaced `{placeholder}` tokens are automatically stripped from the final message
- Frontends can switch on the `messageCode` field for programmatic handling

---

## 13. Database & Migrations

### Database Design Rules

Every table **must** include these BaseEntity columns:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
is_active BOOLEAN DEFAULT true,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
created_by VARCHAR(100),
modified_by VARCHAR(100),
tenant_id VARCHAR(100)
```

### Migration File Naming

```
migrations/001_init.sql
migrations/002_add_indexes.sql
migrations/003_add_category_column.sql
```

- Sequential numbering (`001_`, `002_`, ...)
- Descriptive suffix
- Each file header should include author, date, and description in a SQL comment

### Migration Runner

Each service has a `run-migrations.ts` that:
1. Reads all `.sql` files from the `migrations/` folder (sorted alphabetically)
2. Executes them sequentially using `knex.raw(sql)`
3. Destroys the Knex connection on completion

```bash
# Run for a specific service
npm run migrate -w @cargoez-be/user-service

# Run all migrations
npm run migrate:all
```

### Database Connection

All services use Knex.js exclusively. The legacy `pg.Pool` approach has been removed.

```typescript
import { createKnex } from '@rajkumarganesan93/shared';
import type { Knex } from 'knex';

let _knex: Knex | undefined;

export function getKnex(): Knex {
  if (!_knex) _knex = createKnex();
  return _knex;
}
```

---

## 14. Testing

### Test Stack

- **Jest** — test runner
- **Supertest** — HTTP assertion library
- **SWC** — fast TypeScript transpilation for tests

### Test Strategy

Tests use a **mock repository** injected into use cases. No database required.

```typescript
const mockRepo: IUserRepository = {
  findAll: async () => ({ items: [...], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } }),
  findById: async (id) => mockUsers.get(id) ?? null,
  findOne: async (criteria) => { /* iterate map, match all criteria keys */ },
  findMany: async (criteria) => { /* filter + return paginated */ },
  save: async (input) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const user = { id, ...input, isActive: true, createdAt: now, modifiedAt: now };
    mockUsers.set(id, user);
    return user;
  },
  update: async (id, input) => { /* merge fields, update modifiedAt */ },
  delete: async (id) => { /* soft-delete: set isActive=false */ },
  count: async () => mockUsers.size,
  exists: async (criteria) => { /* check if any match */ },
};
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific service
npm test -w @cargoez-be/user-service
```

### Test Patterns

1. Health check returns 200
2. Create returns 201 with `messageCode: 'CREATED'`
3. Update returns 200 with `messageCode: 'UPDATED'`
4. Delete returns 200 with `messageCode: 'DELETED'` (soft-delete — record still exists with `isActive: false`)
5. List returns 200 with pagination meta
6. Missing required fields return 422 with `messageCode: 'FIELD_REQUIRED'`
7. Duplicate entries return 409 with appropriate `messageCode`

---

## 15. Publishing Packages

All 6 packages are published to [GitHub Packages](https://github.com/rajkumarganesan93/cargoez2-backend/packages) under the `@rajkumarganesan93` scope.

### Current Versions

| Package | Version |
|---------|---------|
| `@rajkumarganesan93/domain` | 1.4.0 |
| `@rajkumarganesan93/application` | 1.1.0 |
| `@rajkumarganesan93/infrastructure` | 1.8.0 |
| `@rajkumarganesan93/api` | 1.4.0 |
| `@rajkumarganesan93/shared` | 1.4.0 |
| `@rajkumarganesan93/integrations` | 1.1.0 |

### Publishing Workflow

```bash
# 1. Set GitHub token
$env:GITHUB_TOKEN = "ghp_your_token_here"    # PowerShell
export GITHUB_TOKEN="ghp_your_token_here"    # Bash

# 2. Bump version in the target package
cd packages/domain
npm version patch    # 1.3.0 → 1.3.1

# 3. Build and publish all packages
npm run publish:packages
```

### Consuming Packages in Other Projects

```
# .npmrc (in consumer project root)
@rajkumarganesan93:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @rajkumarganesan93/domain @rajkumarganesan93/api @rajkumarganesan93/infrastructure @rajkumarganesan93/application @rajkumarganesan93/shared
```

---

## 16. Docker Compose

```bash
# Start everything (Postgres + services)
docker-compose up --build

# Start only Postgres
docker-compose up postgres
```

| Service | Container | Port |
|---------|-----------|------|
| PostgreSQL | `cargoez-postgres` | 5432 |
| user-service | `cargoez-user-service` | 3001 |
| shared-db-example | `cargoez-shared-db-example` | 3005 |

Databases are auto-created via `scripts/init-dbs.sh`.

---

## 17. Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build all packages and services (in dependency order) |
| `npm run build:packages` | Build packages only |
| `npm test` | Run tests across all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting without modifying |
| `npm run migrate:all` | Run all service migrations |
| `npm run migrate:user` | Run user-service migrations |
| `npm run migrate:shared-db-example` | Run shared-db-example migrations |
| `npm run publish:packages` | Build and publish all packages |
| `npm run dev -w @cargoez-be/user-service` | Start user-service in dev mode |
| `npm run dev -w @cargoez-be/shared-db-example` | Start shared-db-example in dev mode |

---

## 18. Coding Rules & Conventions

### TypeScript

- Target: `ES2022` · Module: `NodeNext` · Strict mode enabled
- All imports use `.js` extension (ESM requirement)
- Node.js >= 18.7.0 required (`crypto.randomUUID()`)

### Entity Rules

1. All entities **extend `BaseEntity`**
2. Entity properties use **camelCase only** — never `snake_case`
3. Date fields are `string` (ISO 8601), not `Date` objects
4. No framework imports in domain layer

### Repository Rules

1. All repositories **extend `IRepository`** (9 methods)
2. All implementations **extend `BaseRepository`** (Knex-powered)
3. Use `findOne({ field: value })` — never create `findByField` methods
4. ColumnMap must include **all** BaseEntity fields
5. `writableFields` must only include user-settable fields (not `id`, `isActive`, dates)
6. `delete()` is always **soft-delete**

### Model Binding (Zod Schemas)

Define request/response shapes as Zod schemas in `presentation/models/` folder:

```typescript
// services/user-service/src/presentation/models/user.models.ts
import { z } from 'zod';

export const CreateUserBody = z.object({
  name: z.string().trim().min(1, 'name is required').max(100),
  email: z.string().trim().toLowerCase().min(1, 'email is required').max(150)
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: 'invalid email format' }),
});
export type CreateUserBody = z.infer<typeof CreateUserBody>;

export const IdParams = z.object({
  id: z.string().refine((val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), {
    message: 'id must be a valid UUID',
  }),
});
export type IdParams = z.infer<typeof IdParams>;
```

### Controller Rules

1. Use `ValidatedRequest<TBody, TParams, TQuery>` for typed requests — never raw `Request`
2. Access validated data via `req.validated.body` / `req.validated.params` — never `req.body` directly
3. Use `sendSuccess()` / `sendError()` / `sendPaginated()` — never `res.status(N).json()`
4. Use `parsePaginationFromQuery` for list endpoints
5. Use `MessageCode` for all responses — never raw strings
6. No manual validation in controllers — all validation is in Zod schemas + middleware

### Error Rules

1. Always throw typed error classes (`ValidationError`, `NotFoundError`, `ConflictError`, etc.)
2. Use `ValidationError` (422) for input validation failures, `BadRequestError` (400) only for malformed syntax
3. Always use `MessageCode` with placeholders — never raw strings
4. Let `asyncHandler` + `errorHandler` handle the response formatting
5. Use `{reason}` for `INVALID_INPUT` / `BAD_REQUEST` / `VALIDATION_FAILED`
5. Use `{resource}` for `NOT_FOUND`, `CREATED`, `UPDATED`, `DELETED`
6. Use `{field}` for `FIELD_REQUIRED`, `DUPLICATE_ENTRY`
7. See [ERROR_CODES.md](ERROR_CODES.md) for the complete reference

### Service Entry Point Pattern

Use `createServiceApp` — no more manual boilerplate:

```typescript
import dotenv from 'dotenv';
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import { createServiceApp } from '@rajkumarganesan93/infrastructure';

const { start } = createServiceApp({
  serviceName: 'my-service',
  port: process.env.PORT ?? 3001,
  swaggerSpec,
  routes: (app) => app.use(createMyRoutes(controller)),
  onShutdown: () => knex.destroy(),
});

start();
```

`createServiceApp` handles everything: CORS, `express.json()`, request logging, Swagger UI at `/api-docs`, raw JSON spec at `/api-docs/json`, health check at `/health`, JWT authentication (auto-detected from `KEYCLOAK_ISSUER` env var), 404 catch-all, `errorHandler`, and graceful shutdown (`SIGTERM`/`SIGINT`).

### API Portal (Global Swagger)

The API Portal provides a single Swagger UI with a dropdown to switch between all microservice APIs:

```bash
npm run dev:portal    # starts at http://localhost:4000
```

It fetches each service's OpenAPI spec via `/api-docs/json` endpoints. To add a new service to the portal, update the `SERVICE_URLS` array in `services/api-portal/src/index.ts`.

### Git Workflow

- All code on `main` branch
- Packages published to GitHub Packages
- Commit messages follow conventional format with descriptive body

---

## 19. Authentication & Authorization (Keycloak)

> **Comprehensive guide:** See [AUTHENTICATION.md](AUTHENTICATION.md) for the full reference covering Postman setup, frontend web integration (PKCE), mobile app integration (PKCE), service-to-service auth, token anatomy, troubleshooting, and code examples for React, Angular, React Native, and Flutter.

### Overview

All APIs are protected by **JWT Bearer token** authentication using **Keycloak** as the identity provider (OIDC/OAuth 2.0). The auth middleware lives in `@rajkumarganesan93/infrastructure` — services consume it automatically via `createServiceApp`.

**Authorization Type:** OAuth 2.0 with multiple grant types:
- **Authorization Code + PKCE** — for frontend web apps and mobile apps (recommended)
- **Resource Owner Password Credentials (ROPC)** — for Postman and API testing
- **Client Credentials** — for service-to-service communication

All tokens are RS256-signed JWTs verified via JWKS key discovery.

### Architecture

```
┌─────────────┐     ┌───────────────┐     ┌──────────────────┐
│   Client     │────>│   Keycloak    │     │  Microservice    │
│ (Postman /   │     │  (Auth Server)│     │  (Resource       │
│  Swagger /   │<────│               │     │   Server)        │
│  Frontend)   │     └───────────────┘     │                  │
│              │  access_token (JWT)       │  ┌────────────┐  │
│              │──────────────────────────>│  │ authenticate│  │
│              │  Bearer <token>           │  │ (JWKS)     │  │
│              │                           │  └─────┬──────┘  │
│              │                           │  ┌─────▼──────┐  │
│              │                           │  │ authorize  │  │
│              │                           │  │ (roles)    │  │
│              │<──────────────────────────│  └────────────┘  │
│              │  API Response             └──────────────────┘
└─────────────┘
```

### Keycloak Setup (Local Development)

**Option A: Standalone (Java)**

```bash
# Prerequisites: Java 17+ installed
# Download Keycloak and extract to a directory
# Start in dev mode with realm auto-import:
set KEYCLOAK_ADMIN=admin
set KEYCLOAK_ADMIN_PASSWORD=admin
kc.bat start-dev --import-realm --http-port=8080
```

Place `keycloak/cargoez-realm.json` into Keycloak's `data/import/` folder before starting.

**Option B: Docker Compose**

```bash
docker-compose up -d keycloak
```

Keycloak runs at **http://localhost:8080**.

### Realm Configuration

The `cargoez` realm is auto-imported from `keycloak/cargoez-realm.json`:

| Setting | Value |
|---------|-------|
| **Realm** | `cargoez` |
| **Client (public)** | `cargoez-api` — for Swagger, Postman, and frontend apps |
| **Client (confidential)** | `cargoez-service` — for service-to-service communication |
| **Token Lifespan** | 300 seconds (5 minutes) |
| **SSL Required** | none (dev mode only) |

**Realm Roles:**

| Role | Description |
|------|-------------|
| `admin` | Full administrative access — can create, read, update, and delete |
| `manager` | Manager-level access — can read and update (no create/delete) |
| `user` | Standard user — read-only access |

**Pre-configured Test Users:**

| Username | Password | Roles | Permissions |
|----------|----------|-------|-------------|
| `admin` | `admin123` | `admin`, `user` | Full CRUD on all resources |
| `manager` | `manager123` | `manager`, `user` | GET + PUT only |
| `testuser` | `test123` | `user` | GET only (read-only) |

> **Note:** The Keycloak **Admin Console** at `http://localhost:8080/admin` uses different credentials: `admin` / `admin` (not `admin123`).

### Getting a Token from Postman

**Step 1:** Create a new `POST` request in Postman.

**Step 2:** Set the URL:

```
http://localhost:8080/realms/cargoez/protocol/openid-connect/token
```

**Step 3:** Go to the **Body** tab, select **x-www-form-urlencoded**, and add:

| Key | Value |
|-----|-------|
| `grant_type` | `password` |
| `client_id` | `cargoez-api` |
| `username` | `admin` |
| `password` | `admin123` |

**Step 4:** Click **Send**. You'll receive:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIs...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzUxMiIs...",
  "token_type": "Bearer",
  "scope": "profile email"
}
```

**Step 5:** Copy the `access_token` value.

**Step 6:** To call a protected API, go to the **Authorization** tab of your API request, select **Bearer Token**, and paste the token.

> **Tip:** Save the token request as a Postman collection variable. You can also use Postman's **Pre-request Script** to auto-fetch tokens before each request:
>
> ```javascript
> pm.sendRequest({
>   url: 'http://localhost:8080/realms/cargoez/protocol/openid-connect/token',
>   method: 'POST',
>   header: { 'Content-Type': 'application/x-www-form-urlencoded' },
>   body: {
>     mode: 'urlencoded',
>     urlencoded: [
>       { key: 'grant_type', value: 'password' },
>       { key: 'client_id', value: 'cargoez-api' },
>       { key: 'username', value: 'admin' },
>       { key: 'password', value: 'admin123' },
>     ]
>   }
> }, (err, res) => {
>   pm.collectionVariables.set('access_token', res.json().access_token);
> });
> ```
>
> Then set Authorization to `Bearer {{access_token}}`.

### Getting a Token from curl / PowerShell

**curl (bash):**

```bash
curl -s -X POST http://localhost:8080/realms/cargoez/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=cargoez-api&username=admin&password=admin123" \
  | jq -r '.access_token'
```

**PowerShell:**

```powershell
$body = @{ grant_type="password"; client_id="cargoez-api"; username="admin"; password="admin123" }
$token = (Invoke-RestMethod -Uri "http://localhost:8080/realms/cargoez/protocol/openid-connect/token" `
  -Method POST -Body $body -ContentType "application/x-www-form-urlencoded").access_token
# Use in subsequent calls:
Invoke-RestMethod -Uri "http://localhost:3001/users" -Headers @{ Authorization = "Bearer $token" }
```

### Using Tokens in Swagger UI

1. Open Swagger UI (e.g., http://localhost:3001/api-docs or http://localhost:4000)
2. Click the **"Authorize"** button (lock icon at top-right)
3. Paste the `access_token` value (without the `Bearer ` prefix)
4. Click **"Authorize"** — all subsequent "Try it out" calls include the token
5. The lock icons next to each endpoint turn **locked** when authorized

### Environment Variables

Add to each service's `.env`:

```env
KEYCLOAK_ISSUER=http://localhost:8080/realms/cargoez
KEYCLOAK_AUDIENCE=cargoez-api
```

`createServiceApp` **auto-detects** these env vars after dotenv loads. No code changes needed in service `index.ts` — just set the vars and auth is enabled. Remove/comment them to disable auth.

To explicitly disable auth even when env vars are present:

```typescript
createServiceApp({ ..., auth: false });
```

### How Auth Works (Middleware Pipeline)

```
Request → CORS → JSON Parser → Request Logger → Swagger/Health (public, skip auth)
                                                ↓
                                           authenticate (JWT validation via JWKS)
                                                ↓
                                           authorize('admin') (role check, per-route)
                                                ↓
                                           validateBody/validateParams (Zod)
                                                ↓
                                           Route Handler
```

1. **`cors()`** — enables cross-origin requests (required for the API Portal at `:4000` to call services at `:3001`/`:3005`).
2. **`createAuthMiddleware`** — validates JWT Bearer tokens against Keycloak's JWKS endpoint (`/protocol/openid-connect/certs`). Caches public keys for 10 minutes. On success, attaches `AuthUser` to `req.user`. Public paths (`/health`, `/api-docs`) skip authentication.
3. **`authorize(...roles)`** — per-route middleware that checks if the authenticated user has at least one of the required roles (from `realm_access.roles` or `resource_access.<client>.roles`).

### Route Protection Pattern

```typescript
// routes.ts
import { authorize } from '@rajkumarganesan93/infrastructure';

// Read operations — any authenticated user (all roles)
router.get('/users', asyncHandler(controller.getAll));
router.get('/users/:id', validateParams(IdParams), asyncHandler(controller.getById));

// Write operations — require specific roles
router.post('/users', authorize('admin'), validateBody(CreateUserBody), asyncHandler(controller.create));
router.put('/users/:id', authorize('admin', 'manager'), validateParams(IdParams), validateBody(UpdateUserBody), asyncHandler(controller.update));
router.delete('/users/:id', authorize('admin'), validateParams(IdParams), asyncHandler(controller.delete));
```

### Accessing the Authenticated User

```typescript
import type { AuthenticatedRequest } from '@rajkumarganesan93/infrastructure';

const handler = async (req: ValidatedRequest<CreateUserBody>, res: Response) => {
  const authUser = (req as unknown as AuthenticatedRequest).user;
  console.log(authUser.sub);              // Keycloak user ID (UUID)
  console.log(authUser.email);            // User email
  console.log(authUser.preferredUsername); // Username
  console.log(authUser.realmRoles);       // ['admin', 'user']
  console.log(authUser.resourceRoles);    // Client-specific roles
};
```

### Auth Error Responses

| Scenario | Status | MessageCode | Message |
|----------|--------|-------------|---------|
| No `Authorization` header | 401 | `UNAUTHORIZED` | Authentication required |
| Invalid / malformed token | 401 | `UNAUTHORIZED` | Authentication required |
| Expired token | 401 | `TOKEN_EXPIRED` | Token has expired |
| Valid token, wrong role | 403 | `FORBIDDEN` | You do not have permission to perform this action |

### Disabling Auth for Development

Remove or comment out `KEYCLOAK_ISSUER` in `.env`:

```env
# KEYCLOAK_ISSUER=http://localhost:8080/realms/cargoez
```

When the variable is absent, `createServiceApp` skips auth middleware entirely — all endpoints become publicly accessible.

### Keycloak Admin Console

Access **http://localhost:8080/admin** (credentials: `admin` / `admin`) to:
- Manage users, roles, and clients
- View active sessions
- Configure password policies
- Set up additional identity providers
- Switch to the `cargoez` realm from the top-left dropdown

---

## 20. API Portal (Global Swagger)

The API Portal at `http://localhost:4000` provides a unified Swagger UI that aggregates all microservice APIs into a single page with a dropdown to switch between services.

### Starting the Portal

```bash
npm run dev:portal    # Development mode (tsx)
# or
npm run build -w @cargoez-be/api-portal
node services/api-portal/dist/src/index.js
```

### How It Works

1. The portal serves Swagger UI at the root (`/`)
2. It uses `swaggerOptions.urls` to point to each service's `/api-docs/json` endpoint
3. The browser fetches the OpenAPI spec from each service and renders it
4. When you click "Try it out", the browser sends requests directly to the target service (e.g., `localhost:3001`)
5. CORS is enabled on all services via `cors()` middleware, so cross-origin requests from the portal work seamlessly

### Using Auth in the Portal

1. Get a token from Keycloak (see [Section 19](#19-authentication--authorization-keycloak))
2. Select a service from the dropdown (e.g., "User Service")
3. Click the **"Authorize"** button
4. Paste the `access_token` and click **"Authorize"**
5. All "Try it out" calls for that service will include the token

> **Note:** You need to authorize separately for each service in the dropdown since each has its own Swagger spec.

### Adding a New Service to the Portal

Edit `services/api-portal/src/index.ts` and add an entry to `SERVICE_URLS`:

```typescript
const SERVICE_URLS = [
  { url: 'http://localhost:3001/api-docs/json', name: 'User Service' },
  { url: 'http://localhost:3005/api-docs/json', name: 'Shared DB Example' },
  { url: 'http://localhost:3002/api-docs/json', name: 'Product Service' },  // new
];
```

### Endpoints

| URL | Description |
|-----|-------------|
| `http://localhost:4000` | Swagger UI with service dropdown |
| `http://localhost:4000/health` | Portal health check |

---

## 21. Error Codes Reference

See [ERROR_CODES.md](ERROR_CODES.md) for the complete reference of all message codes, HTTP statuses, message templates, placeholders, and example request/response payloads.

---

## Related Documentation

| Document | Description |
|---|---|
| [PACKAGES.md](PACKAGES.md) | Package index with exports, usage examples, and dependency graph |
| [AUTHENTICATION.md](AUTHENTICATION.md) | Keycloak setup, OAuth/PKCE flows, Postman tokens, frontend/mobile integration |
| [ERROR_CODES.md](ERROR_CODES.md) | Message codes, HTTP statuses, and error response reference |

---

## License

Private — CargoEz Platform
