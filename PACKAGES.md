# CargoEz Backend — Package Reference

This monorepo contains six npm packages that form a layered architecture for building Express-based microservices. All packages are published to GitHub Packages under the `@rajkumarganesan93` scope.

## Package Index

| Package | Version | Description |
|---|---|---|
| [`@rajkumarganesan93/domain`](#domain) | 1.4.0 | Core domain types, interfaces, and contracts |
| [`@rajkumarganesan93/application`](#application) | 1.1.0 | Application-layer utilities: mapping, audit, logging |
| [`@rajkumarganesan93/shared`](#shared) | 1.4.0 | Shared utilities: DB config, Express helpers, pagination |
| [`@rajkumarganesan93/api`](#api) | 1.4.0 | API response builders and Message Catalog |
| [`@rajkumarganesan93/infrastructure`](#infrastructure) | 1.8.0 | Express middleware, error handling, auth, Swagger, app factory |
| [`@rajkumarganesan93/integrations`](#integrations) | 1.1.0 | Third-party integration interfaces (email, notifications) |

## Dependency Graph

```
domain (base — no dependencies)
  ├── application  → domain
  ├── shared       → domain
  ├── api          → domain
  └── infrastructure → domain, application, api
      (top-level package that ties everything together)

integrations (standalone — no workspace dependencies)
```

---

## domain

**Package:** `@rajkumarganesan93/domain@1.4.0`
**Location:** `packages/domain`

Pure TypeScript types and interfaces with zero runtime dependencies. This is the foundation of the architecture — all other packages depend on it.

### Exports

| Export | Kind | Purpose |
|---|---|---|
| `BaseEntity` | Type | Common entity fields (`id`, `createdAt`, `modifiedAt`, `isActive`, etc.) |
| `IRepository<T, CreateInput, UpdateInput>` | Interface | Generic repository contract for data access |
| `PaginationRequest` | Type | Pagination query parameters (`page`, `limit`, `sortBy`, `sortOrder`) |
| `PaginatedResult<T>` | Type | Paginated response with items + meta |
| `ListOptions` | Type | Options for list queries (pagination, sorting, filtering) |
| `RequestEnvelope` | Type | Wraps incoming request data |
| `ApiSuccessResponse` | Type | Shape of successful API responses |
| `ApiErrorResponse` | Type | Shape of error API responses |
| `ColumnMap` | Type | Maps entity field names to DB column names |

### Usage

```typescript
import { BaseEntity, IRepository, PaginatedResult } from '@rajkumarganesan93/domain';

interface User extends BaseEntity {
  name: string;
  email: string;
}

interface IUserRepository extends IRepository<User, CreateUserInput, UpdateUserInput> {
  findByEmail(email: string): Promise<User | null>;
}
```

---

## application

**Package:** `@rajkumarganesan93/application@1.1.0`
**Location:** `packages/application`

Application-layer utilities for entity-to-row mapping, audit logging, and structured logging with Pino.

### Exports

| Export | Kind | Purpose |
|---|---|---|
| `toEntity()` | Function | Converts a DB row to a domain entity |
| `toRow()` | Function | Converts a domain entity to a DB row |
| `createLogger()` | Function | Creates a named Pino logger instance |
| `logger` | Default export | Pre-configured Pino logger |
| `AuditService` | Class | Records audit trail entries |
| `InMemoryAuditRepository` | Class | In-memory audit storage (for dev/testing) |
| `IAuditRepository` | Interface | Contract for audit data persistence |
| `AuditEntry` | Type | Shape of an audit record |

### Usage

```typescript
import { createLogger, toEntity, toRow } from '@rajkumarganesan93/application';

const logger = createLogger('user-service');
logger.info('Service started');

const entity = toEntity(dbRow, columnMap);
const row = toRow(entity, columnMap);
```

---

## shared

**Package:** `@rajkumarganesan93/shared@1.4.0`
**Location:** `packages/shared`

Shared utilities for database configuration, Knex instance creation, Express async handlers, and pagination parsing.

### Exports

| Export | Kind | Purpose |
|---|---|---|
| `getDbConfig()` | Function | Reads DB config from environment variables |
| `getConfig()` | Function | General app configuration loader |
| `createKnex()` | Function | Creates a configured Knex.js instance |
| `asyncHandler()` | Function | Wraps async Express handlers with error catching |
| `healthCheck()` | Function | Express handler for `/health` endpoint |
| `parsePaginationFromQuery()` | Function | Parses `page`, `limit`, `sortBy`, `sortOrder` from query string |
| `DbConfig` | Type | Database connection configuration shape |
| `PaginationConfig` | Type | Pagination defaults and constraints |

### Usage

```typescript
import { createKnex, getDbConfig, asyncHandler, parsePaginationFromQuery } from '@rajkumarganesan93/shared';

const db = createKnex(getDbConfig());

router.get('/items', asyncHandler(async (req, res) => {
  const pagination = parsePaginationFromQuery(req.query);
  const items = await repository.findAll(pagination);
  res.json(items);
}));
```

---

## api

**Package:** `@rajkumarganesan93/api@1.4.0`
**Location:** `packages/api`

API response builders and a centralized Message Catalog for consistent, type-safe API responses across all services.

### Exports

| Export | Kind | Purpose |
|---|---|---|
| `success()` | Function | Build a success response with message code |
| `error()` | Function | Build an error response with message code |
| `errorRaw()` | Function | Build an error response with raw message |
| `successPaginated()` | Function | Build a paginated success response |
| `resolveMessage()` | Function | Resolve a message code to human-readable text |
| `MessageCode` | Enum | All available message codes (`CREATED`, `UPDATED`, `DELETED`, etc.) |
| `MessageCatalog` | Object | Maps message codes to templates and HTTP statuses |
| `HttpStatus` | Constant | HTTP status code constants |

### Usage

```typescript
import { success, error, successPaginated, MessageCode, HttpStatus } from '@rajkumarganesan93/api';

// Success response
const response = success(MessageCode.CREATED, { id: '123', name: 'Item' });
// → { success: true, messageCode: "CREATED", message: "Created successfully", data: {...} }

// Paginated response
const paginated = successPaginated(MessageCode.LIST_FETCHED, items, meta);

// Error response
const err = error(MessageCode.NOT_FOUND, HttpStatus.NOT_FOUND);
```

---

## infrastructure

**Package:** `@rajkumarganesan93/infrastructure@1.8.0`
**Location:** `packages/infrastructure`

The top-level package that ties everything together. Provides Express middleware, error classes, validation, JWT authentication, Swagger integration, and the `createServiceApp()` factory for bootstrapping services.

### Exports

| Export | Kind | Purpose |
|---|---|---|
| **App Factory** | | |
| `createServiceApp()` | Function | Bootstraps an Express app with middleware, Swagger, auth, logging |
| **Error Classes** | | |
| `AppError` | Class | Base error class with message code |
| `BadRequestError` | Class | 400 Bad Request |
| `UnauthorizedError` | Class | 401 Unauthorized |
| `ForbiddenError` | Class | 403 Forbidden |
| `NotFoundError` | Class | 404 Not Found |
| `ConflictError` | Class | 409 Conflict |
| `ValidationError` | Class | 422 Validation Error |
| **Middleware** | | |
| `errorHandler()` | Middleware | Global error handler |
| `requestLogger()` | Middleware | HTTP request logging (Pino) |
| `createAuthMiddleware()` | Middleware | JWT token verification via Keycloak JWKS |
| `authorize()` | Middleware | Role-based access control |
| `validateBody()` | Middleware | Zod schema validation for request body |
| `validateParams()` | Middleware | Zod schema validation for route params |
| `validateQuery()` | Middleware | Zod schema validation for query string |
| **Response Helpers** | | |
| `sendSuccess()` | Function | Send a typed success response |
| `sendError()` | Function | Send a typed error response |
| `sendPaginated()` | Function | Send a typed paginated response |
| **Data Access** | | |
| `BaseRepository` | Class | Generic Knex-based repository with CRUD, pagination, soft-delete |
| **Swagger Utilities** | | |
| `zodToSwagger()` | Function | Convert Zod schema to Swagger/OpenAPI schema |
| `SwaggerTypedSuccessResponse()` | Function | Generate typed success response schema |
| `SwaggerTypedPaginatedResponse()` | Function | Generate typed paginated response schema |
| `SwaggerRequestBody()` | Function | Generate request body schema |
| `SwaggerBearerAuth()` | Function | Swagger bearer auth security definition |
| **Schemas** | | |
| `IdParams` | Zod Schema | Validates UUID route parameters |
| `BaseEntitySchema` | Zod Schema | Base entity validation schema |
| **Types** | | |
| `AuthUser` | Type | Authenticated user from JWT (`sub`, `email`, `roles`) |
| `AuthenticatedRequest` | Type | Express Request with `user` property |
| `ServiceAppConfig` | Type | Configuration for `createServiceApp()` |
| `ValidatedRequest` | Type | Request with validated body/params/query |
| **Re-exports** | | |
| `z` | Object | Zod validation library (re-exported for convenience) |

### Usage

```typescript
import {
  createServiceApp,
  BaseRepository,
  authorize,
  validateBody,
  sendSuccess,
  sendPaginated,
  NotFoundError,
  z,
} from '@rajkumarganesan93/infrastructure';

// Bootstrap a service
const { app, router, auth } = await createServiceApp({
  serviceName: 'my-service',
  port: 3002,
  swaggerSpec: mySwaggerDoc,
});

// Protected route with validation and role check
router.post('/items',
  auth,                          // JWT verification
  authorize('admin', 'manager'), // role check
  validateBody(CreateItemSchema),
  async (req, res) => {
    const item = await repository.create(req.body);
    sendSuccess(res, MessageCode.CREATED, item, 201);
  }
);

// Repository with built-in pagination and soft-delete
class ItemRepository extends BaseRepository<Item, CreateInput, UpdateInput> {
  constructor(db: Knex) {
    super(db, 'items', columnMap);
  }
}
```

---

## integrations

**Package:** `@rajkumarganesan93/integrations@1.1.0`
**Location:** `packages/integrations`

Interfaces and stub implementations for third-party integrations. Provides a contract-based approach so services can swap real providers without code changes.

### Exports

| Export | Kind | Purpose |
|---|---|---|
| `IEmailProvider` | Interface | Contract for sending emails |
| `INotificationProvider` | Interface | Contract for sending push notifications |
| `EmailMessage` | Type | Shape of an email message |
| `NotificationPayload` | Type | Shape of a notification |
| `StubEmailProvider` | Class | No-op email provider (for dev/testing) |
| `StubNotificationProvider` | Class | No-op notification provider (for dev/testing) |

### Usage

```typescript
import { IEmailProvider, StubEmailProvider } from '@rajkumarganesan93/integrations';

// Use stub in development, real provider in production
const emailProvider: IEmailProvider =
  process.env.NODE_ENV === 'production'
    ? new SendGridEmailProvider(apiKey)
    : new StubEmailProvider();

await emailProvider.send({
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Hello!',
});
```

---

## Installing Packages

All packages are published to GitHub Packages. Configure your `.npmrc`:

```
@rajkumarganesan93:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Then install:

```bash
npm install @rajkumarganesan93/domain
npm install @rajkumarganesan93/infrastructure
# ... etc.
```

Within the monorepo, packages are resolved via npm workspaces automatically — no manual install needed.

## Building Packages

```bash
# Build all packages (respects dependency order)
npm run build:packages

# Build everything (packages + services)
npm run build

# Build a single package
npm run build -w @rajkumarganesan93/domain
```

## Publishing Packages

```bash
# Build and publish all packages
npm run publish:packages

# Publish a single package
npm publish -w @rajkumarganesan93/infrastructure
```

> **Note:** Bump the version in `package.json` before publishing. Follow semver — patch for fixes, minor for new features, major for breaking changes.

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) — Full development guide, architecture, coding conventions
- [AUTHENTICATION.md](./AUTHENTICATION.md) — Keycloak setup, OAuth flows, PKCE, token management
- [ERROR_CODES.md](./ERROR_CODES.md) — Message codes and error reference
