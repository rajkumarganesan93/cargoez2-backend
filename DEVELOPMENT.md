# CargoEz Backend — Development Guide

> Nx monorepo with NestJS microservices, Clean Architecture, PostgreSQL, Keycloak authentication, and multi-tenant SaaS database isolation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [BaseEntity & Audit Columns](#baseentity--audit-columns)
3. [Clean Architecture Layers](#clean-architecture-layers)
4. [Repositories: BaseRepository & TenantBaseRepository](#repositories-baserepository--tenantbaserepository)
5. [Adding a New Entity to an Existing Service](#adding-a-new-entity-to-an-existing-service)
6. [Database & Migrations](#database--migrations)
7. [Request Context & resolve-context](#request-context--resolve-context)
8. [Guard Pipeline](#guard-pipeline)
9. [Permission Key Format & @RequirePermission](#permission-key-format--requirepermission)
10. [API Response Standards](#api-response-standards)
11. [Real-Time Data Sync](#real-time-data-sync)
12. [Shared Libraries](#shared-libraries)
13. [Nx Build System](#nx-build-system)
14. [Coding Conventions](#coding-conventions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Frontend Portals                                │
│  admin.cargoez.com (SysAdmin)         app.cargoez.com (Tenant)      │
└──────────┬──────────────────────────────────┬────────────────────────┘
           │                                  │
┌──────────▼──────────┐  ┌───────────────────▼────────────────────────┐
│  admin-service :3001│  │  freight :3002  contacts :3003  books :3004│
│  admin_db (24 tbl)  │  │  Tenant DBs only via TenantConnectionMgr  │
│  + tenant DBs       │  │                                            │
│                     │  │  ContextInterceptor calls                  │
│  /internal/         │  │  admin-service /internal/resolve-context   │
│  resolve-context    │  │  once per request (cached 5 min)           │
└──────────┬──────────┘  └───────────────────┬────────────────────────┘
           │                                  │
┌──────────▼──────────────────────────────────▼────────────────────────┐
│  PostgreSQL :5432                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐                       │
│  │ admin_db │  │shared_db │  │tenant_code_db│  (per-tenant)          │
│  └──────────┘  └──────────┘  └──────────────┘                       │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                          ┌────────▼────────┐
                          │  Keycloak :8080  │
                          │  cargoez realm   │
                          └─────────────────┘
```

### Key Principles

- **Multi-tenant SaaS**: admin_db for platform management; shared_db / tenant_code_db for tenant data
- **Clean Architecture**: 4-layer separation (Domain -> Application -> Infrastructure -> Presentation)
- **Single resolve-context**: One internal call resolves user identity, DB connection, and permissions
- **Pure ABAC**: Permission keys as `module.operation`, evaluated from RequestContext (no HTTP call at guard level)
- **Convention over Configuration**: All services follow identical structure and patterns

---

## BaseEntity & Audit Columns

Every entity in the system extends `BaseEntity` from `@cargoez/domain`:

```typescript
// libs/domain/src/entities/base.entity.ts
export interface BaseEntity {
  uid: string;            // UUID primary key
  tenant_uid: string;     // Tenant identifier
  is_active: boolean;     // Soft-delete flag (default: true)
  created_at: Date;       // Record creation timestamp
  modified_at: Date;      // Last modification timestamp
  created_by: string;     // UUID of creating user
  modified_by: string;    // UUID of last modifier
}
```

### Migration Template

Every table must include these 7 base columns:

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shipments', (table) => {
    table.uuid('uid').primary().defaultTo(knex.fn.uuid());
    table.uuid('tenant_uid').notNullable().index();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.uuid('modified_by').nullable();

    // Entity-specific columns
    table.string('tracking_number').notNullable();
    table.string('origin').notNullable();
    table.string('destination').notNullable();
    table.decimal('weight', 10, 2).nullable();
  });
}
```

### Auto-populated by Repository

`BaseRepository` and `TenantBaseRepository` automatically populate audit fields from `RequestContext`:

| Column | Source | Populated On |
|---|---|---|
| `tenant_uid` | `RequestContext.tenantUid` | `save()` |
| `created_by` | `RequestContext.userId` | `save()` |
| `modified_by` | `RequestContext.userId` | `save()`, `update()` |
| `modified_at` | `new Date()` | `update()` |

---

## Clean Architecture Layers

Every service follows the same 4-layer structure:

### Layer 1: Domain (innermost)

**Location:** `src/domain/`
**Dependencies:** None — pure TypeScript only
**Contains:** Entity interfaces, repository interface contracts, DI tokens

```typescript
// domain/entities/shipment.entity.ts
import { BaseEntity } from '@cargoez/domain';

export interface Shipment extends BaseEntity {
  tracking_number: string;
  origin: string;
  destination: string;
  weight?: number;
}
```

```typescript
// domain/repositories/shipment-repository.interface.ts
import { IBaseRepository } from '@cargoez/domain';
import { Shipment } from '../entities/shipment.entity';

export const SHIPMENT_REPOSITORY = 'SHIPMENT_REPOSITORY';
export type IShipmentRepository = IBaseRepository<Shipment>;
```

**Rules:**
- No NestJS decorators
- No database imports
- No framework imports
- Only `@cargoez/domain` types

### Layer 2: Application

**Location:** `src/application/use-cases/`
**Dependencies:** Domain layer only
**Contains:** One class per use case, each with an `execute()` method

```typescript
// application/use-cases/create-shipment.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { Shipment } from '../../domain/entities/shipment.entity';
import { IShipmentRepository, SHIPMENT_REPOSITORY } from '../../domain/repositories/shipment-repository.interface';

@Injectable()
export class CreateShipmentUseCase {
  constructor(@Inject(SHIPMENT_REPOSITORY) private readonly repo: IShipmentRepository) {}

  execute(data: Partial<Shipment>): Promise<Shipment> {
    return this.repo.save(data);
  }
}
```

**Rules:**
- Inject repository via DI token (`@Inject(SHIPMENT_REPOSITORY)`)
- Never import infrastructure implementations directly
- Business validation and orchestration logic lives here

### Layer 3: Infrastructure

**Location:** `src/infrastructure/`
**Dependencies:** Domain layer + `@cargoez/shared`, `@cargoez/infrastructure`
**Contains:** Concrete repository implementations

```typescript
// infrastructure/repositories/shipment.repository.ts
import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { TenantBaseRepository } from '@cargoez/infrastructure';
import { Shipment } from '../../domain/entities/shipment.entity';

@Injectable()
export class ShipmentRepository extends TenantBaseRepository<Shipment> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'shipments');
  }
}
```

### Layer 4: Presentation (outermost)

**Location:** `src/presentation/`
**Dependencies:** Application layer (use cases) + `@cargoez/api`, `@cargoez/infrastructure`
**Contains:** Controllers, DTOs, NestJS module

```typescript
// presentation/controllers/shipments.controller.ts
@ApiTags('Shipments')
@ApiBearerAuth()
@Controller('shipments')
export class ShipmentsController {
  constructor(
    private readonly createShipment: CreateShipmentUseCase,
    private readonly getAllShipments: GetAllShipmentsUseCase,
  ) {}

  @Get()
  async findAll(@Query('page') page: number, ...) {
    const result = await this.getAllShipments.execute({ page, limit, ... });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Post()
  @RequirePermission('freight.create')
  async create(@Body() dto: CreateShipmentDto) {
    const shipment = await this.createShipment.execute(dto);
    return createSuccessResponse(MessageCode.CREATED, shipment);
  }
}
```

```typescript
// presentation/shipments.module.ts
@Module({
  controllers: [ShipmentsController],
  providers: [
    { provide: SHIPMENT_REPOSITORY, useClass: ShipmentRepository },
    CreateShipmentUseCase,
    GetAllShipmentsUseCase,
    GetShipmentByIdUseCase,
    UpdateShipmentUseCase,
    DeleteShipmentUseCase,
  ],
})
export class ShipmentsModule {}
```

**Dependency rule:** `Presentation -> Application -> Domain <- Infrastructure`

---

## Repositories: BaseRepository & TenantBaseRepository

### BaseRepository

Used by `admin-service` for entities in `admin_db` (no tenant DB switching needed):

```typescript
import { BaseRepository } from '@cargoez/infrastructure';

@Injectable()
export class TenantRepository extends BaseRepository<Tenant> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'tenants');
  }
}
```

### TenantBaseRepository

Used by `freight-service`, `contacts-service`, and `books-service` for entities in tenant databases. Automatically resolves the tenant DB connection via `TenantConnectionManager`:

```typescript
import { TenantBaseRepository } from '@cargoez/infrastructure';

@Injectable()
export class ShipmentRepository extends TenantBaseRepository<Shipment> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'shipments');
  }
}
```

`TenantBaseRepository` extends `BaseRepository` with:
- Automatic tenant DB connection resolution from `RequestContext`
- `tenant_uid` filtering on all queries
- Tenant-scoped CRUD operations

---

## Adding a New Entity to an Existing Service

Follow this checklist to add a new entity (e.g., `Invoice` to `books-service`):

### Step 1 — Create the migration

```typescript
// apps/books-service/migrations/20260312000001_create_invoices.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('invoices', (table) => {
    // BaseEntity columns (required)
    table.uuid('uid').primary().defaultTo(knex.fn.uuid());
    table.uuid('tenant_uid').notNullable().index();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.uuid('modified_by').nullable();

    // Entity-specific columns
    table.string('invoice_number').notNullable().unique();
    table.decimal('total', 12, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.enum('status', ['draft', 'sent', 'paid', 'cancelled']).defaultTo('draft');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invoices');
}
```

### Step 2 — Domain layer

```typescript
// domain/entities/invoice.entity.ts
import { BaseEntity } from '@cargoez/domain';

export interface Invoice extends BaseEntity {
  invoice_number: string;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
}
```

```typescript
// domain/repositories/invoice-repository.interface.ts
import { IBaseRepository } from '@cargoez/domain';
import { Invoice } from '../entities/invoice.entity';

export const INVOICE_REPOSITORY = 'INVOICE_REPOSITORY';
export type IInvoiceRepository = IBaseRepository<Invoice>;
```

### Step 3 — Infrastructure (repository)

```typescript
// infrastructure/repositories/invoice.repository.ts
import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { TenantBaseRepository } from '@cargoez/infrastructure';
import { Invoice } from '../../domain/entities/invoice.entity';

@Injectable()
export class InvoiceRepository extends TenantBaseRepository<Invoice> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'invoices');
  }
}
```

### Step 4 — Application (use cases)

Create use case files in `application/use-cases/`: create, get-all, get-by-id, update, delete.

### Step 5 — Presentation (controller, DTOs, module)

Create controller with `@RequirePermission('books.create')` etc., DTOs with validation, and wire everything in the module.

### Step 6 — Register

- Import `InvoicesModule` in the service's `app.module.ts`
- Run migrations: `pnpm migrate:books`

---

## Database & Migrations

### Database Types

| Database | Used By | Purpose |
|---|---|---|
| `admin_db` | admin-service | Central management (24 tables: tenants, branches, sys_admins, app_customers, admin roles/permissions, subscriptions, products, metadata) |
| `shared_db` | All tenant services | Shared reference data |
| `tenant_code_db` | All tenant services | Per-tenant isolated data |

### TenantConnectionManager

Tenant services don't configure a static database. Instead, `TenantConnectionManager` resolves the correct tenant DB connection at runtime from the request context (populated by `ContextInterceptor` via resolve-context).

```typescript
// Simplified flow:
// 1. Request arrives at freight-service
// 2. ContextInterceptor calls admin-service /internal/resolve-context
// 3. resolve-context returns: { user, tenantDb: "tenant_acme_db", permissions }
// 4. TenantConnectionManager creates/reuses a Knex connection to tenant_acme_db
// 5. TenantBaseRepository uses that connection for all queries
```

### Running Migrations

```bash
pnpm migrate:admin      # admin_db — central management tables + seed
pnpm migrate:shared     # shared_db — shared reference tables
```

Tenant database migrations are applied during tenant provisioning by admin-service.

---

## Request Context & resolve-context

### The resolve-context Endpoint

admin-service exposes a single internal endpoint that combines three concerns:

```
GET /internal/resolve-context
Headers: Authorization: Bearer <JWT>
```

**Response:**

```json
{
  "user": {
    "uid": "user-uuid",
    "email": "user@tenant.com",
    "keycloak_sub": "kc-uuid",
    "tenant_uid": "tenant-uuid",
    "tenant_code": "acme"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "tenant_acme_db"
  },
  "permissions": [
    { "key": "freight.create", "conditions": { "tenant_isolation": true } },
    { "key": "freight.read", "conditions": null }
  ]
}
```

### How It Works

1. `ContextInterceptor` fires on every authenticated request
2. Extracts `keycloak_sub` from the validated JWT
3. Calls `admin-service /internal/resolve-context` (cached 5 min per keycloak_sub)
4. admin-service looks up the user in `admin_db` by keycloak_sub
5. Resolves the user's tenant, tenant DB connection info, and permissions from the tenant DB
6. Returns the combined context
7. `ContextInterceptor` populates `RequestContext` with all resolved data
8. `PermissionsGuard` reads permissions directly from `RequestContext` — no additional HTTP call

### RequestContext Shape

```typescript
interface RequestContext {
  requestId: string;
  userId: string;          // User UID from admin_db
  userEmail: string;
  keycloakSub: string;     // Keycloak subject ID
  tenantUid: string;       // Tenant UID
  tenantCode: string;      // Tenant code (used for DB name)
  roles: string[];         // Keycloak realm roles
  permissions: Permission[];
  tenantDbConfig: DbConfig;
  timestamp: Date;
}
```

---

## Guard Pipeline

Every request passes through the following pipeline in order:

```
Request
  │
  ▼
┌──────────────┐
│ JwtAuthGuard │  Validates JWT via Keycloak JWKS endpoint.
│              │  Skipped on @Public() routes.
│              │  Attaches decoded claims to request.user
└──────┬───────┘
       ▼
┌──────────────────┐
│ContextInterceptor│  Calls /internal/resolve-context (cached 5 min).
│                  │  Populates RequestContext with user identity,
│                  │  tenant DB config, and permissions.
└──────┬───────────┘
       ▼
┌──────────────────┐
│PermissionsGuard  │  Reads permissions from RequestContext (no HTTP call).
│                  │  Checks @RequirePermission('module.operation').
│                  │  Evaluates ABAC conditions.
│                  │  Attaches abacFilters to request context.
└──────┬───────────┘
       ▼
    Controller
```

### Decorators

| Decorator | Purpose | Example |
|---|---|---|
| `@Public()` | Skip JWT verification entirely | Health checks |
| `@RequirePermission('module.operation')` | ABAC-controlled authorization | `@RequirePermission('freight.create')` |

---

## Permission Key Format & @RequirePermission

### Format

Permission keys use the `module.operation` format:

```
freight.create
freight.read
freight.update
freight.delete
contacts.create
contacts.read
books.export
books.approve
```

### Usage in Controllers

```typescript
import { RequirePermission, Public } from '@cargoez/infrastructure';

@Controller('shipments')
export class ShipmentsController {
  @Get('health')
  @Public()
  health() { ... }

  @Get()
  findAll() { ... }                          // Any authenticated user

  @Post()
  @RequirePermission('freight.create')       // ABAC-controlled
  create(@Body() dto) { ... }

  @Put(':id')
  @RequirePermission('freight.update')       // ABAC-controlled
  update(@Param('id') id, @Body() dto) { ... }

  @Delete(':id')
  @RequirePermission('freight.delete')       // ABAC-controlled
  remove(@Param('id') id) { ... }
}
```

### How PermissionsGuard Works

1. Reads the `permissions` array from `RequestContext` (already resolved by ContextInterceptor)
2. Checks if the required permission key exists in the array
3. Evaluates ABAC conditions (tenant_isolation, ownership_only, etc.)
4. If conditions produce filters, attaches them to `request.abacFilters` for `TenantBaseRepository`
5. **No HTTP call** — everything is in-memory from the cached resolve-context response

> See [RBAC-ABAC.md](RBAC-ABAC.md) for the full ABAC permission system documentation.

---

## API Response Standards

### Controllers Must Use `createSuccessResponse()`

```typescript
import { createSuccessResponse, MessageCode } from '@cargoez/api';

@Get()
async findAll(...) {
  const result = await this.getAllItems.execute({ page, limit, ... });
  return createSuccessResponse(MessageCode.LIST_FETCHED, result);
}
```

### Use Cases Throw Typed Exceptions

```typescript
import { NotFoundException, AlreadyExistsException } from '@cargoez/api';

const item = await this.repo.findById(id);
if (!item) throw new NotFoundException('Shipment');
```

### Pagination

All list endpoints support these query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page |
| `sortBy` | string | `created_at` | Column to sort by |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction |
| `search` | string | — | Full-text search across specified fields |

---

## Real-Time Data Sync

### How It Works

1. `BaseRepository` / `TenantBaseRepository` emits a `DomainEvent` via `domainEventBus` on every `save()`, `update()`, and `delete()`
2. `RealtimeGateway` listens on `domainEventBus` and broadcasts to subscribed Socket.IO rooms
3. Frontend clients subscribe to rooms and receive live `data-changed` events

### Room Patterns

| Room | Events Received |
|---|---|
| `entity:<table>` | All CRUD events for a table |
| `entity:<table>:<uid>` | Changes to a specific record |
| `tenant:<tenantUid>` | All events for a tenant |

---

## Shared Libraries

| Library | What It Provides |
|---|---|
| `@cargoez/domain` | `BaseEntity` (uid, tenant_uid, is_active, timestamps, audit), `IBaseRepository`, `PaginationOptions`, `PaginatedResult` |
| `@cargoez/api` | `MessageCode`, `MessageCatalog`, `createSuccessResponse()`, `AppException`, `NotFoundException` |
| `@cargoez/shared` | `DatabaseModule.forRoot()`, `TenantConnectionManager`, `@InjectKnex()` |
| `@cargoez/infrastructure` | `AuthModule`, `BaseRepository`, `TenantBaseRepository`, `RequestContext`, `ContextInterceptor`, `PermissionsGuard`, `AbacEvaluator`, `RealtimeModule`, `PinoLoggerService`, `GlobalExceptionFilter` |

> See [PACKAGES.md](PACKAGES.md) for the complete export reference.

---

## Nx Build System

### Key Commands

```bash
pnpm build              # Build all (cached, dependency-aware)
pnpm build:affected     # Build only what changed
pnpm graph              # Visualize dependency graph
npx nx build admin-service   # Build a single project
```

### Module Resolution at Runtime

The `register-paths.js` script maps `@cargoez/*` imports to their compiled `dist/libs/` paths at runtime:

```bash
node -r ./register-paths.js dist/apps/admin-service/src/main.js
```

---

## Coding Conventions

### File Naming

| Type | Pattern | Example |
|---|---|---|
| Entity | `<name>.entity.ts` | `shipment.entity.ts` |
| Repository interface | `<name>-repository.interface.ts` | `shipment-repository.interface.ts` |
| Repository impl | `<name>.repository.ts` | `shipment.repository.ts` |
| Use case | `<action>-<name>.use-case.ts` | `create-shipment.use-case.ts` |
| Controller | `<name>.controller.ts` | `shipments.controller.ts` |
| DTO | `<action>-<name>.dto.ts` | `create-shipment.dto.ts` |
| Module | `<name>.module.ts` | `shipments.module.ts` |

### Database Column Naming

- Use `snake_case` for database columns: `created_at`, `modified_by`, `tenant_uid`
- Use `camelCase` for TypeScript properties where applicable
- `BaseRepository` / `TenantBaseRepository` handles the conversion automatically

### Import Order

1. NestJS / Node.js built-ins
2. `@cargoez/*` shared libraries
3. Relative imports (domain -> application -> infrastructure -> presentation)

### Do Not

- Import infrastructure implementations in use cases (use DI tokens)
- Import database-specific code in the domain layer
- Put business logic in controllers (use cases only)
- Skip the `ApiResponse` envelope (always use `createSuccessResponse`)
- Store `tenant_uid` in JWT (it's resolved via admin-service lookup)

---

## Related Documentation

- [README.md](./README.md) — Project overview, how to run
- [PACKAGES.md](./PACKAGES.md) — Shared libraries reference
- [AUTHENTICATION.md](./AUTHENTICATION.md) — Keycloak, multi-tenant auth, resolve-context flow
- [ERROR_CODES.md](./ERROR_CODES.md) — Message codes & error responses
- [RBAC-ABAC.md](./RBAC-ABAC.md) — Pure ABAC permission system

---

## License

Private — CargoEz Platform
