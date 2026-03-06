# CargoEz Backend — Development Guide

> Nx monorepo with NestJS microservices, Clean Architecture, PostgreSQL, and Keycloak authentication.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Clean Architecture Layers](#clean-architecture-layers)
3. [Adding a New Microservice](#adding-a-new-microservice)
4. [Adding a New Entity to an Existing Service](#adding-a-new-entity-to-an-existing-service)
5. [Database & Migrations](#database--migrations)
6. [Request Context](#request-context)
7. [Authentication & Authorization](#authentication--authorization)
8. [API Response Standards](#api-response-standards)
9. [Real-Time Data Sync](#real-time-data-sync)
10. [Shared Libraries](#shared-libraries)
11. [Nx Build System](#nx-build-system)
12. [Coding Conventions](#coding-conventions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    API Portal (:4000)                     │
│           Swagger UI + Reverse Proxy                     │
│  ┌──────────────────┐  ┌──────────────────────────┐     │
│  │ Service Dropdown  │  │ Proxies API calls to     │     │
│  │ (select service)  │  │ correct service port     │     │
│  └──────────────────┘  └──────────────────────────┘     │
└────────────┬────────────────────────┬───────────────────┘
             │                        │
   ┌─────────▼─────────┐   ┌─────────▼──────────────┐
   │ user-service :3001 │   │ shared-db-example :3005 │
   │ DB: user_service_db│   │ DB: master_db           │
   │ Table: users       │   │ Table: countries        │
   └─────────┬──────────┘   └─────────┬──────────────┘
             │                        │
   ┌─────────▼────────────────────────▼──────────────┐
   │              Shared Libraries                    │
   │  @cargoez/domain  @cargoez/api                  │
   │  @cargoez/shared  @cargoez/infrastructure       │
   └─────────────────────────────────────────────────┘
             │
   ┌─────────▼─────────┐   ┌─────────────────┐
   │   PostgreSQL       │   │   Keycloak       │
   │   :5432            │   │   :8080          │
   └────────────────────┘   └─────────────────┘
```

### Key Principles

- **Microservices**: Each service is independently deployable with its own database
- **Clean Architecture**: 4-layer separation (Domain → Application → Infrastructure → Presentation)
- **Dependency Inversion**: Use cases depend on domain interfaces; infrastructure provides implementations
- **Shared Libraries**: Common concerns (auth, DB, logging) are shared but not coupled
- **Convention over Configuration**: All services follow identical structure and patterns

---

## Clean Architecture Layers

Every microservice follows the same 4-layer structure:

### Layer 1: Domain (innermost)

**Location:** `src/domain/`
**Dependencies:** None — pure TypeScript only
**Contains:** Entity interfaces, repository interface contracts, DI tokens

```typescript
// domain/entities/user.entity.ts
import { BaseEntity } from '@cargoez/domain';

export interface User extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
}
```

```typescript
// domain/repositories/user-repository.interface.ts
import { IBaseRepository } from '@cargoez/domain';
import { User } from '../entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';
export type IUserRepository = IBaseRepository<User>;
```

**Rules:**
- No NestJS decorators (except in the type alias)
- No database imports
- No framework imports
- Only `@cargoez/domain` types

### Layer 2: Application

**Location:** `src/application/use-cases/`
**Dependencies:** Domain layer only
**Contains:** One class per use case, each with an `execute()` method

```typescript
// application/use-cases/create-user.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';

@Injectable()
export class CreateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  execute(data: { name: string; email: string; phone?: string }): Promise<User> {
    return this.userRepo.save(data as Partial<User>);
  }
}
```

```typescript
// application/use-cases/get-user-by-id.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';

@Injectable()
export class GetUserByIdUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('User');
    return user;
  }
}
```

**Rules:**
- Inject repository via DI token (`@Inject(USER_REPOSITORY)`)
- Never import infrastructure implementations directly
- Business validation and orchestration logic lives here
- Each use case is a single `@Injectable()` class

### Layer 3: Infrastructure

**Location:** `src/infrastructure/`
**Dependencies:** Domain layer + `@cargoez/shared`, `@cargoez/infrastructure`
**Contains:** Concrete repository implementations

```typescript
// infrastructure/repositories/user.repository.ts
import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'users');
  }
}
```

**Rules:**
- Extends `BaseRepository<T>` for standard CRUD
- Database-specific logic lives here
- Custom queries (joins, complex filters) go here as additional methods

### Layer 4: Presentation (outermost)

**Location:** `src/presentation/`
**Dependencies:** Application layer (use cases) + `@cargoez/api`, `@cargoez/infrastructure`
**Contains:** Controllers, DTOs, NestJS module

```typescript
// presentation/controllers/users.controller.ts
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly getAllUsers: GetAllUsersUseCase,
    private readonly createUser: CreateUserUseCase,
    // ...
  ) {}

  @Get()
  async findAll(@Query('page') page: number, ...) {
    const result = await this.getAllUsers.execute({ page, limit, ... });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateUserDto) {
    const user = await this.createUser.execute(dto);
    return createSuccessResponse(MessageCode.CREATED, user);
  }
}
```

```typescript
// presentation/dto/create-user.dto.ts
export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
```

```typescript
// presentation/users.module.ts — the DI wiring point
@Module({
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    CreateUserUseCase,
    GetAllUsersUseCase,
    GetUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
  ],
})
export class UsersModule {}
```

**Rules:**
- Controllers inject use cases, never repositories
- DTOs use `class-validator` + `@nestjs/swagger` decorators
- The module binds domain interfaces to infrastructure implementations
- HTTP concerns (status codes, headers) stay in the controller

---

## Adding a New Microservice

### Step 1 — Create the directory structure

```bash
mkdir -p apps/my-service/src/{domain/entities,domain/repositories,application/use-cases,infrastructure/repositories,presentation/{controllers,dto}}
```

### Step 2 — Create project files

Copy from an existing service and modify:
- `apps/my-service/package.json` — set `name`
- `apps/my-service/project.json` — set `name`, `sourceRoot`, build/serve targets
- `apps/my-service/tsconfig.json` — extend from root
- `apps/my-service/tsconfig.app.json` — app-specific TS config

### Step 3 — Create the domain layer

```typescript
// src/domain/entities/item.entity.ts
import { BaseEntity } from '@cargoez/domain';

export interface Item extends BaseEntity {
  name: string;
  description?: string;
}
```

```typescript
// src/domain/repositories/item-repository.interface.ts
import { IBaseRepository } from '@cargoez/domain';
import { Item } from '../entities/item.entity';

export const ITEM_REPOSITORY = 'ITEM_REPOSITORY';
export type IItemRepository = IBaseRepository<Item>;
```

### Step 4 — Create use cases, repository, controller, DTOs, module

Follow the patterns shown in [Clean Architecture Layers](#clean-architecture-layers) above.

### Step 5 — Create main.ts and app.module.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { config } from 'dotenv';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, PinoLoggerService, ContextInterceptor } from '@cargoez/infrastructure';

config({ path: join(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new PinoLoggerService();
  app.useLogger(logger);
  app.enableCors({
    origin: [
      'http://localhost:3000', 'http://localhost:5173',
      'http://localhost:5174', 'http://localhost:5175',
      'http://localhost:5176', 'http://localhost:5177',
      'http://localhost:4200', 'http://localhost:8100',
    ],
    credentials: true,
  });
  app.setGlobalPrefix('my-service');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ContextInterceptor());

  const port = process.env['MY_SERVICE_PORT'] || 3002;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('My Service')
    .setDescription('Description here')
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}`, 'My Service (direct)')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('my-service/api-docs', app, document);

  app.getHttpAdapter().get('/my-service/api-docs/json', (_req: any, res: any) => {
    res.json(document);
  });

  await app.listen(port);
  logger.log(`My Service running on http://localhost:${port}/my-service`);
}

bootstrap();
```

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@cargoez/shared';
import { AuthModule, RealtimeModule } from '@cargoez/infrastructure';
import { ItemsModule } from './presentation/items.module';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    DatabaseModule.forRoot({ connectionPrefix: 'MY_SERVICE' }),
    AuthModule,
    RealtimeModule,
    ItemsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

### Step 6 — Register in API Portal

Add to `SERVICES` array in `apps/api-portal/src/main.ts`:

```typescript
{
  name: 'My Service',
  slug: 'my-service',
  prefix: '/my-service',
  target: `http://localhost:${MY_SERVICE_PORT}`,
  docsUrl: `http://localhost:${MY_SERVICE_PORT}/my-service/api-docs/json`,
}
```

### Step 7 — Add environment variables

In `.env`:

```env
MY_SERVICE_DB_NAME=my_service_db
MY_SERVICE_PORT=3002
# Uncomment to use a different database server:
# MY_SERVICE_DB_HOST=other-host.rds.amazonaws.com
# MY_SERVICE_DB_PORT=5432
# MY_SERVICE_DB_USER=my_svc_user
# MY_SERVICE_DB_PASSWORD="secret"
```

### Step 8 — Add scripts to root `package.json`

```json
"start:myservice": "nx serve my-service",
"dev:myservice": "node -r ./register-paths.js dist/apps/my-service/src/main.js"
```

---

## Adding a New Entity to an Existing Service

To add a new entity (e.g., `Product`) to an existing service:

1. **Domain:** Create `domain/entities/product.entity.ts` and `domain/repositories/product-repository.interface.ts`
2. **Application:** Create use case files in `application/use-cases/` (create, get-all, get-by-id, update, delete)
3. **Infrastructure:** Create `infrastructure/repositories/product.repository.ts` extending `BaseRepository<Product>`
4. **Presentation:** Create controller, DTOs, and a `ProductsModule`
5. **Import** `ProductsModule` in the service's `app.module.ts`
6. **Create migration** for the new database table

---

## Database & Migrations

### Per-Service Database Connections

Each microservice can use its own database — and optionally its own database server. The `connectionPrefix` option controls which environment variables are read:

| Service | Prefix | Env Vars | Default DB |
|---|---|---|---|
| `user-service` | `USER_SERVICE` | `USER_SERVICE_DB_HOST`, `USER_SERVICE_DB_PORT`, `USER_SERVICE_DB_USER`, `USER_SERVICE_DB_PASSWORD`, `USER_SERVICE_DB_NAME` | `user_service_db` |
| `shared-db-example` | `SHARED_DB` | `SHARED_DB_DB_HOST`, `SHARED_DB_DB_PORT`, `SHARED_DB_DB_USER`, `SHARED_DB_DB_PASSWORD`, `SHARED_DB_DB_NAME` | `master_db` |

Each `{PREFIX}_DB_*` variable falls back to the shared `DB_*` default if not set. This means:
- **Same server, different databases** — just set `{PREFIX}_DB_NAME`
- **Completely different servers** — set all `{PREFIX}_DB_*` vars

### DatabaseModule

```typescript
// Per-service connection: reads USER_SERVICE_DB_* env vars, falls back to DB_*
DatabaseModule.forRoot({ connectionPrefix: 'USER_SERVICE' })
```

```env
# .env — shared defaults
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD="password"

# User Service — only overrides DB name (uses shared host/port/user/password)
USER_SERVICE_DB_NAME=user_service_db

# Shared DB — uses a completely different server
SHARED_DB_DB_HOST=shared-instance.rds.amazonaws.com
SHARED_DB_DB_PORT=5433
SHARED_DB_DB_USER=shared_user
SHARED_DB_DB_PASSWORD="different_password"
SHARED_DB_DB_NAME=master_db
```

The `useFactory` callback defers `process.env` reads to NestJS DI resolution time, ensuring `dotenv.config()` has already run.

### Migrations

Migrations live in each service's `migrations/` directory and use Knex:

```typescript
// apps/user-service/migrations/20240101000001_create_users.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.string('phone').nullable();
    table.string('created_by').nullable();
    table.string('modified_by').nullable();
    table.string('tenant_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('modified_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
```

### Audit Fields

`BaseRepository` automatically populates these fields from `RequestContext`:

| Column | Source | On |
|---|---|---|
| `created_by` | `getCurrentUserId()` | `save()` |
| `modified_by` | `getCurrentUserId()` | `save()`, `update()` |
| `tenant_id` | `getCurrentTenantId()` | `save()` |
| `modified_at` | `new Date()` | `update()` |

---

## Request Context

Every authenticated request has an `AsyncLocalStorage`-based context propagated through the entire call chain:

```typescript
interface RequestContext {
  requestId: string;      // Auto-generated UUID per request
  userId?: string;        // From JWT `preferred_username` or `sub`
  userEmail?: string;     // From JWT `email`
  roles: string[];        // From JWT `realm_access.roles`
  tenantId?: string;      // From JWT custom claim (if configured)
  timestamp: Date;        // Request start time
}
```

### Accessing Context

```typescript
import { getContext, getCurrentUserId } from '@cargoez/infrastructure';

// In any service, use case, or repository:
const ctx = getContext();        // throws if no context
const userId = getCurrentUserId(); // 'anonymous' if no user
```

### /users/me Endpoint

The `GET /users/me` endpoint returns the current context extracted from the JWT:

```json
{
  "success": true,
  "messageCode": "FETCHED",
  "data": {
    "requestId": "916caa28-...",
    "userId": "admin",
    "userEmail": "admin@cargoez.com",
    "roles": ["admin", "user"],
    "tenantId": null,
    "timestamp": "2026-03-04T07:47:24.802Z"
  }
}
```

---

## Authentication & Authorization

### How It Works

1. `JwtAuthGuard` (global) extracts the Bearer token from the `Authorization` header
2. Token is verified against Keycloak's JWKS endpoint (`/protocol/openid-connect/certs`)
3. Decoded claims are attached to `request.user`
4. `ContextInterceptor` populates `RequestContext` from the decoded JWT
5. `RolesGuard` checks `@Roles()` decorator against `realm_access.roles`

### Decorators

```typescript
@Public()          // Skip JWT verification for this route
@Roles('admin')    // Require 'admin' role
@Roles('admin', 'manager')  // Require any of these roles
```

### Getting a Token

```bash
curl -X POST http://localhost:8080/realms/cargoez/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=cargoez-api&username=admin&password=admin123"
```

> See [AUTHENTICATION.md](AUTHENTICATION.md) for complete OAuth flow documentation.

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

// In use case:
const user = await this.userRepo.findById(id);
if (!user) throw new NotFoundException('User');
```

### Pagination

All list endpoints support these query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page |
| `sortBy` | string | `createdAt` | Column to sort by |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction |
| `search` | string | — | Full-text search across specified fields |

---

## Real-Time Data Sync

### How It Works

1. `BaseRepository` emits a `DomainEvent` via `domainEventBus` on every `save()`, `update()`, and `delete()`
2. `RealtimeGateway` listens on `domainEventBus` and broadcasts to subscribed Socket.IO rooms
3. Frontend clients subscribe to rooms and receive live `data-changed` events

### Domain Event Shape

```typescript
interface DomainEvent {
  entity: string;       // Table name (e.g., 'users')
  action: string;       // 'created' | 'updated' | 'deleted'
  entityId: string;     // UUID of affected record
  data: any;            // Full entity data (or null for delete)
  actor: string;        // userId who made the change
  tenantId?: string;    // Tenant ID (if applicable)
  timestamp: Date;
}
```

### Room Patterns

| Room | Events Received |
|---|---|
| `entity:users` | All user CRUD events |
| `entity:users:<uuid>` | Changes to a specific user |
| `tenant:<tenantId>` | All events for a tenant |

### Frontend Integration

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', { auth: { token } });
socket.emit('subscribe', { room: 'entity:users' });
socket.on('data-changed', (event) => {
  // Refresh your data / update store
});
```

---

## Shared Libraries

| Library | What It Provides |
|---|---|
| `@cargoez/domain` | `BaseEntity`, `IBaseRepository`, `PaginationOptions`, `PaginatedResult` |
| `@cargoez/api` | `MessageCode`, `MessageCatalog`, `createSuccessResponse()`, `AppException`, `NotFoundException` |
| `@cargoez/shared` | `DatabaseModule.forRoot()`, `@InjectKnex()` |
| `@cargoez/infrastructure` | `AuthModule`, `BaseRepository`, `RequestContext`, `RealtimeModule`, `PinoLoggerService`, `GlobalExceptionFilter` |

> See [PACKAGES.md](PACKAGES.md) for the complete export reference.

---

## Nx Build System

### Key Commands

```bash
pnpm build              # Build all (cached, dependency-aware)
pnpm build:affected     # Build only what changed
pnpm graph              # Visualize dependency graph
npx nx build user-service   # Build a single project
npx nx affected --graph     # See what's affected by changes
```

### How Caching Works

Nx caches build outputs in `.nx/cache/`. If source files haven't changed, rebuilds are instant. The dependency graph ensures libraries are built before applications that import them.

### Module Resolution at Runtime

The `register-paths.js` script maps `@cargoez/*` imports to their compiled `dist/libs/` paths at runtime:

```bash
node -r ./register-paths.js dist/apps/user-service/src/main.js
```

This is required because Node.js doesn't natively understand TypeScript path aliases in compiled output.

---

## Coding Conventions

### File Naming

| Type | Pattern | Example |
|---|---|---|
| Entity | `<name>.entity.ts` | `user.entity.ts` |
| Repository interface | `<name>-repository.interface.ts` | `user-repository.interface.ts` |
| Repository impl | `<name>.repository.ts` | `user.repository.ts` |
| Use case | `<action>-<name>.use-case.ts` | `create-user.use-case.ts` |
| Controller | `<name>.controller.ts` | `users.controller.ts` |
| DTO | `<action>-<name>.dto.ts` | `create-user.dto.ts` |
| Module | `<name>.module.ts` | `users.module.ts` |

### Database Column Naming

- Use `snake_case` for database columns: `created_at`, `modified_by`
- Use `camelCase` for TypeScript properties: `createdAt`, `modifiedBy`
- `BaseRepository` handles the conversion automatically

### Import Order

1. NestJS / Node.js built-ins
2. `@cargoez/*` shared libraries
3. Relative imports (domain → application → infrastructure → presentation)

### Do Not

- Import infrastructure implementations in use cases (use DI tokens)
- Import database-specific code in the domain layer
- Put business logic in controllers (use cases only)
- Skip the `ApiResponse` envelope (always use `createSuccessResponse`)
- Hardcode database connection details (use `connectionPrefix` in `DatabaseModule.forRoot()`)

---

## Related Documentation

- [README.md](./README.md) — Project overview, how to run
- [PACKAGES.md](./PACKAGES.md) — Shared libraries reference
- [AUTHENTICATION.md](./AUTHENTICATION.md) — Keycloak, OAuth, PKCE, tokens
- [ERROR_CODES.md](./ERROR_CODES.md) — Message codes & error responses
- [ARCHITECTURE-COMPARISON.md](./ARCHITECTURE-COMPARISON.md) — Express → NestJS migration analysis

---

## License

Private — CargoEz Platform
