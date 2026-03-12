# CargoEz Backend — Shared Libraries Reference

This Nx monorepo contains four shared libraries under `libs/`, imported as `@cargoez/*` via TypeScript path aliases. These libraries form the layered foundation used by all microservices.

## Library Index

| Library | Import Path | Description |
|---|---|---|
| [`@cargoez/domain`](#cargoezdomain) | `libs/domain` | Core domain types — entities, repository interfaces, pagination |
| [`@cargoez/api`](#cargoezapi) | `libs/api` | API response envelope, message codes, exception classes |
| [`@cargoez/shared`](#cargoezshared) | `libs/shared` | Database module (Knex provider, DI integration) |
| [`@cargoez/infrastructure`](#cargoezinfrastructure) | `libs/infrastructure` | Auth guards, request context, base repository, real-time, logger, exception filter |

## Dependency Graph

```
@cargoez/domain           (no dependencies — pure interfaces)
@cargoez/api              (no dependencies — pure enums/functions)
@cargoez/shared           (no dependencies — NestJS module only)
@cargoez/infrastructure   → domain, api, shared
```

All service applications (`apps/*`) import from these libraries. Libraries never import from applications.

---

## @cargoez/domain

**Location:** `libs/domain/src`

Pure TypeScript interfaces with zero runtime dependencies. This is the innermost layer of Clean Architecture — no NestJS, no Knex, no framework code.

### Exports

| Export | Kind | Purpose |
|---|---|---|
| `BaseEntity` | Interface | Common entity fields: `uid`, `tenant_uid`, `is_active`, `created_at`, `modified_at`, `created_by`, `modified_by` |
| `RequestContext` | Interface | Request context shape (from `context/request-context.ts`): `requestId`, `userId`, `userEmail`, `keycloakSub`, `tenantUid`, `tenantCode`, `roles`, `permissions`, `tenantDbConfig` |
| `getContext()` | Function | Get current request context (throws if none) |
| `getContextOrNull()` | Function | Get current request context or `null` |
| `IBaseRepository<T>` | Interface | Generic repository contract: `findAll`, `findById`, `save`, `update`, `delete` |
| `PaginationOptions` | Interface | Query options: `page`, `limit`, `sortBy`, `sortOrder`, `search`, `searchFields` |
| `PaginatedResult<T>` | Interface | Paginated response: `data[]` + `pagination { page, limit, total, totalPages }` |

### Usage

```typescript
import { BaseEntity, IBaseRepository, PaginatedResult } from '@cargoez/domain';

// Define a domain entity (in your service's domain/ layer)
export interface User extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
}

// Define a repository interface (in your service's domain/ layer)
export const USER_REPOSITORY = 'USER_REPOSITORY';
export type IUserRepository = IBaseRepository<User>;
```

### BaseEntity Fields

| Field | Type | Description |
|---|---|---|
| `uid` | `string` | UUID primary key |
| `tenant_uid` | `string?` | Tenant isolation ID |
| `is_active` | `boolean` | Soft-delete flag (default: true) |
| `created_at` | `Date` | Row creation timestamp |
| `modified_at` | `Date` | Last modification timestamp |
| `created_by` | `string?` | User ID who created (auto-populated from RequestContext) |
| `modified_by` | `string?` | User ID who last modified (auto-populated from RequestContext) |

---

## @cargoez/api

**Location:** `libs/api/src`

API response builders and a centralized Message Catalog. No framework dependencies — pure TypeScript enums and functions.

### Exports

| Export | Kind | Purpose |
|---|---|---|
| `MessageCode` | Enum | All message codes: `CREATED`, `UPDATED`, `DELETED`, `FETCHED`, `LIST_FETCHED`, `NOT_FOUND`, `ALREADY_EXISTS`, `VALIDATION_FAILED`, `FIELD_REQUIRED`, `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_ERROR` |
| `MessageCatalog` | Map | Maps each `MessageCode` to `{ httpStatus, message }` |
| `MessageEntry` | Interface | Shape of a catalog entry |
| `ApiResponse<T>` | Interface | Unified response envelope: `{ success, messageCode, message, data?, errors? }` |
| `createSuccessResponse()` | Function | Build a success response from a message code + data |
| `createErrorResponse()` | Function | Build an error response from a message code + errors |
| `AppException` | Class | Base NestJS `HttpException` subclass with `messageCode` |
| `NotFoundException` | Class | 404 — `new NotFoundException('User')` → `"User not found"` |
| `AlreadyExistsException` | Class | 409 — `new AlreadyExistsException('User')` → `"User already exists"` |
| `ValidationException` | Class | 422 — `new ValidationException(errors)` |

### Usage

```typescript
import { createSuccessResponse, createErrorResponse, MessageCode } from '@cargoez/api';
import { NotFoundException } from '@cargoez/api';

// In a controller
return createSuccessResponse(MessageCode.CREATED, newUser);

// In a use case
const user = await this.userRepo.findById(id);
if (!user) throw new NotFoundException('User');
return user;
```

### MessageCode → HTTP Status Mapping

| MessageCode | HTTP Status | Default Message |
|---|---|---|
| `SUCCESS` | 200 | Operation completed successfully |
| `CREATED` | 201 | Resource created successfully |
| `UPDATED` | 200 | Resource updated successfully |
| `DELETED` | 200 | Resource deleted successfully |
| `FETCHED` | 200 | Resource fetched successfully |
| `LIST_FETCHED` | 200 | Resources fetched successfully |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_EXISTS` | 409 | Resource already exists |
| `VALIDATION_FAILED` | 422 | Validation failed |
| `FIELD_REQUIRED` | 422 | Required field is missing |
| `INVALID_INPUT` | 422 | Invalid input provided |
| `UNAUTHORIZED` | 401 | Unauthorized access |
| `FORBIDDEN` | 403 | Access forbidden |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## @cargoez/shared

**Location:** `libs/shared/src`

NestJS database module that provides a configured Knex.js connection pool via dependency injection.

### Exports

| Export | Kind | Purpose |
|---|---|---|
| `DatabaseModule` | NestJS Module | `DatabaseModule.forRoot(options?)` — creates a global Knex provider for admin-service |
| `TenantDatabaseModule` | NestJS Module | `TenantDatabaseModule.forRoot()` — provides `TenantConnectionManager` for tenant services |
| `TenantConnectionManager` | Class | Resolves and caches per-tenant Knex connections at runtime |
| `DatabaseModuleOptions` | Interface | `{ connectionPrefix?, databaseEnvKey?, database? }` — per-service DB connection config |
| `KNEX_CONNECTION` | DI Token | Injection token for the Knex instance |
| `InjectKnex` | Decorator | `@InjectKnex()` — shorthand for `@Inject(KNEX_CONNECTION)` |

### Usage

```typescript
// app.module.ts — each service specifies its database via env key
@Module({
  imports: [
    DatabaseModule.forRoot({ connectionPrefix: 'USER_SERVICE' }),
  ],
})
export class AppModule {}
```

```typescript
// In a repository
import { InjectKnex } from '@cargoez/shared';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'users');
  }
}
```

### DatabaseModule.forRoot() Options

| Option | Type | Description |
|---|---|---|
| `connectionPrefix` | `string` | Env variable prefix for per-service connection. Reads `{PREFIX}_DB_HOST`, `{PREFIX}_DB_PORT`, `{PREFIX}_DB_USER`, `{PREFIX}_DB_PASSWORD`, `{PREFIX}_DB_NAME`, falling back to shared `DB_*` values. |
| `databaseEnvKey` | `string` | Env variable name holding just the database name (legacy, still supported) |
| `database` | `string` | Explicit database name (overrides everything) |
| _(none)_ | — | Falls back to `DB_NAME` env var, then `'cargoez'` |

**Resolution order for each connection field** (e.g., host):
1. `{PREFIX}_DB_HOST` (if `connectionPrefix` is set and the env var exists)
2. `DB_HOST` (shared default)
3. Hardcoded fallback (`'localhost'`)

This allows services to share a single database server (just set `{PREFIX}_DB_NAME`) or use completely independent connection strings (set all `{PREFIX}_DB_*` vars).

---

## @cargoez/infrastructure

**Location:** `libs/infrastructure/src`

The top-level shared library. Provides all cross-cutting concerns: authentication, authorization, request context, data access, real-time sync, logging, and error handling.

### Exports — Authentication

| Export | Kind | Purpose |
|---|---|---|
| `JwtAuthGuard` | NestJS Guard | Validates JWT Bearer tokens via Keycloak JWKS endpoint |
| `RolesGuard` | NestJS Guard | Checks `@Roles()` decorator against `realm_access.roles` from JWT |
| `PermissionsGuard` | NestJS Guard | Checks `@RequirePermission()` against auth-service permissions (cached, with ABAC evaluation) |
| `AuthModule` | NestJS Module | Registers `JwtAuthGuard` + `RolesGuard` + `PermissionsGuard` (all global) |
| `@Public()` | Decorator | Marks a route as public (skips JWT validation) |
| `@Roles(...roles)` | Decorator | Area-level role gate — restricts entire controllers (e.g., `@Roles('super-admin')`). Do NOT use on individual CRUD methods. |
| `@RequirePermission(key)` | Decorator | Requires specific permission key (e.g., `@RequirePermission('user-management.users.create')`) |
| `PermissionCache` | Class | In-memory cache for resolved permissions (5-min TTL, role-combo keyed) |
| `AbacEvaluator` | Class | Evaluates ABAC conditions (tenant_isolation, ownership_only, department, time_window, custom_rules) |

### Exports — Request Context

| Export | Kind | Purpose |
|---|---|---|
| `RequestContext` | Interface | `{ requestId, userId, userEmail, roles, tenantId, timestamp, abacFilters? }` |
| `ContextInterceptor` | NestJS Interceptor | Extracts JWT claims → populates `AsyncLocalStorage` context for the request |
| `getContext()` | Function | Get current request context (throws if none) |
| `getContextOrNull()` | Function | Get current request context or `null` |
| `getCurrentUserId()` | Function | Shorthand for `getContext().userId ?? 'anonymous'` |
| `getCurrentTenantId()` | Function | Shorthand for `getContext().tenantId` |
| `runWithContext()` | Function | Execute code within a context scope (for testing) |

### Exports — Data Access

| Export | Kind | Purpose |
|---|---|---|
| `BaseRepository<T>` | Class | Generic Knex-based repository for admin-service: CRUD, pagination, search, auto audit fields, ABAC filter enforcement, domain event emission |
| `TenantBaseRepository<T>` | Class | Extends BaseRepository for tenant services: lazy tenant DB connection resolution via `TenantConnectionManager`, automatic `tenant_uid` scoping |

### Exports — Real-Time

| Export | Kind | Purpose |
|---|---|---|
| `RealtimeGateway` | WebSocket Gateway | Socket.IO server with JWT auth, room-based subscriptions, broadcasts domain events |
| `RealtimeModule` | NestJS Module | Registers the gateway |
| `DomainEvent` | Interface | `{ entity, action, entityId, data, actor, tenantId, timestamp }` |
| `domainEventBus` | Singleton | In-process event emitter — `BaseRepository` emits here, `RealtimeGateway` listens |

### Exports — Logging & Errors

| Export | Kind | Purpose |
|---|---|---|
| `PinoLoggerService` | NestJS Logger | Structured JSON logger using Pino |
| `GlobalExceptionFilter` | Exception Filter | Catches all exceptions, returns consistent `ApiResponse` error format |

### Usage

```typescript
// In a controller
import { RequirePermission, getContext } from '@cargoez/infrastructure';

@Controller('users')
export class UsersController {
  @Get('me')
  getMe() {
    const context = getContext();
    return createSuccessResponse(MessageCode.FETCHED, context);
  }

  @Post()
  @RequirePermission('user-management.users.create')
  async create(@Body() dto: CreateUserDto) {
    // createdBy/modifiedBy are auto-populated by BaseRepository from RequestContext
    // ABAC filters are auto-applied by BaseRepository from PermissionsGuard
    return this.createUser.execute(dto);
  }
}
```

```typescript
// In an infrastructure repository
import { BaseRepository } from '@cargoez/infrastructure';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'users'); // table name
  }
  // Inherits: findAll, findById, save, update, delete
  // Auto: audit fields, domain events, pagination, search, ABAC filters
}
```

---

## Adding a New Library

1. Create the directory under `libs/`:
   ```bash
   mkdir -p libs/my-lib/src
   ```

2. Add `package.json`, `tsconfig.json`, `tsconfig.lib.json`, and `project.json` (copy from an existing lib).

3. Add the path alias to `tsconfig.base.json`:
   ```json
   "@cargoez/my-lib": ["libs/my-lib/src/index.ts"]
   ```

4. Export everything from `libs/my-lib/src/index.ts`.

5. Add it to `pnpm-workspace.yaml` if not already covered by the glob pattern.

---

## Related Documentation

- [README.md](./README.md) — Project overview, how to run, quick reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) — Full development guide, adding new services, coding conventions
- [AUTHENTICATION.md](./AUTHENTICATION.md) — Keycloak setup, OAuth flows, PKCE, token management
- [RBAC-ABAC.md](./RBAC-ABAC.md) — RBAC + ABAC permission system, auth-service APIs, ABAC conditions
- [ERROR_CODES.md](./ERROR_CODES.md) — Message codes and error response reference
