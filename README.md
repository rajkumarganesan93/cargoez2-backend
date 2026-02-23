# cargoez2-backend

Node.js microservices monorepo with PostgreSQL, Clean Architecture, and publishable shared packages.

## Architecture

```
cargoez2-backend/
├── packages/                    # Publishable @rajkumarganesan93/* packages
│   ├── domain/                  # BaseEntity, IRepository (9 methods), pagination, ColumnMap
│   ├── application/             # Mapper, Audit, Logger
│   ├── infrastructure/          # Error handler, AppError classes
│   ├── api/                     # MessageCode, MessageCatalog, success(), error()
│   ├── shared/                  # getDbConfig, asyncHandler, parsePaginationFromQuery
│   └── integrations/            # Email & notification interfaces + stubs
├── services/
│   ├── user-service/            # User CRUD APIs (port 3001, DB: user_service_db)
│   └── shared-db-example/       # Country CRUD APIs (port 3005, DB: master_db)
├── .npmrc                       # GitHub Packages registry config
├── docker-compose.yml
└── package.json                 # npm workspaces root
```

### Package dependency graph

```
@rajkumarganesan93/shared        → domain
@rajkumarganesan93/domain        (no deps)
@rajkumarganesan93/api           → domain
@rajkumarganesan93/application   → domain
@rajkumarganesan93/infrastructure → application, api, domain
@rajkumarganesan93/integrations  (no deps)
```

### Clean Architecture layers (per service)

```
Domain          → entities (extend BaseEntity), repository interfaces (extend IRepository)
Application     → use cases, orchestration logic
Infrastructure  → db.ts (pg pool), repository implementations (all 9 IRepository methods)
Presentation    → controllers, routes (with Swagger JSDoc), swagger.ts
```

---

## Quick start (local development)

### Prerequisites

- Node.js >= 18.7.0
- PostgreSQL (localhost:5432)
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Create databases

```sql
CREATE DATABASE user_service_db;
CREATE DATABASE master_db;
```

### 3. Configure environment

Each service has a `.env` file under `services/<service>/`. Example for user-service:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=user_service_db
PORT=3001
```

### 4. Build and migrate

```bash
npm run build
npm run migrate:all
```

### 5. Start services

```bash
# Terminal 1
npm run dev -w @cargoez-be/user-service

# Terminal 2
npm run dev -w @cargoez-be/shared-db-example
```

### 6. Verify

| Service           | Health check                    | Swagger docs                     |
| ----------------- | ------------------------------- | -------------------------------- |
| user-service      | http://localhost:3001/health    | http://localhost:3001/api-docs   |
| shared-db-example | http://localhost:3005/health    | http://localhost:3005/api-docs   |

---

## Packages

All packages are published to [GitHub Packages](https://github.com/rajkumarganesan93/cargoez2-backend/packages) under the `@rajkumarganesan93` scope.

| Package | Purpose | README |
| ------- | ------- | ------ |
| `@rajkumarganesan93/domain` | BaseEntity, IRepository (9 methods), pagination, API response types, ColumnMap | [packages/domain/README.md](packages/domain/README.md) |
| `@rajkumarganesan93/application` | Entity mapper (toEntity/toRow), audit service, pino logger | [packages/application/README.md](packages/application/README.md) |
| `@rajkumarganesan93/infrastructure` | AppError classes (MessageCode-aware), errorHandler/requestLogger middleware | [packages/infrastructure/README.md](packages/infrastructure/README.md) |
| `@rajkumarganesan93/api` | MessageCode, MessageCatalog, response helpers: success(), error(), successPaginated() | [packages/api/README.md](packages/api/README.md) |
| `@rajkumarganesan93/shared` | getDbConfig, asyncHandler, parsePaginationFromQuery | [packages/shared/README.md](packages/shared/README.md) |
| `@rajkumarganesan93/integrations` | IEmailProvider, INotificationProvider + stub implementations | [packages/integrations/README.md](packages/integrations/README.md) |

---

## Installing packages

### 1. Create `.npmrc` in your project root

```
@rajkumarganesan93:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 2. Install packages

```bash
npm install @rajkumarganesan93/domain @rajkumarganesan93/application @rajkumarganesan93/infrastructure @rajkumarganesan93/api @rajkumarganesan93/shared
```

---

## Developer guide: building a new service

Follow this guide when creating a new microservice that uses the `@rajkumarganesan93` packages. The `shared-db-example` service is a working reference implementation.

### Step 1: Define your entity

Every entity extends `BaseEntity` (camelCase properties only):

```typescript
import type { BaseEntity } from '@rajkumarganesan93/domain';

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  price: number;
}
// BaseEntity provides id, isActive, createdAt, modifiedAt (ISO 8601 strings), createdBy, modifiedBy, tenantId
```

### Step 2: Define repository interface

All repository interfaces **must** extend `IRepository`. Do not add bespoke `findByX` methods -- use the generic `findOne(criteria)` instead.

```typescript
import type { IRepository } from '@rajkumarganesan93/domain';
import type { Product } from '../entities/Product.js';

export interface CreateProductInput { name: string; sku: string; price: number; }
export interface UpdateProductInput { name?: string; price?: number; }

export interface IProductRepository extends IRepository<Product, CreateProductInput, UpdateProductInput> {}
```

`IRepository` provides these 9 methods:

| Method | Signature | Purpose |
| ------ | --------- | ------- |
| `findById` | `(id: string) => T \| null` | Get one by primary key |
| `findAll` | `(options?) => PaginatedResult<T>` | Paginated list |
| `findOne` | `(criteria) => T \| null` | Find first matching record |
| `findMany` | `(criteria, options?) => PaginatedResult<T>` | Filtered paginated list |
| `save` | `(input) => T` | Create a new record |
| `update` | `(id, input) => T \| null` | Update by ID |
| `delete` | `(id) => boolean` | Soft-delete by ID (sets isActive=false) |
| `count` | `(criteria?) => number` | Count matching records |
| `exists` | `(criteria) => boolean` | Check if any record matches |

### Step 3: Implement repository

Implement all 9 methods. Prefer extending `BaseRepository` (uses Knex, throws on unknown criteria keys). Use an `ALLOWED_COLUMNS` allowlist when building WHERE clauses from criteria keys. Note: `delete()` performs a soft-delete (sets `isActive=false`), not a hard delete.

```typescript
import { getKnex } from '../db.js';
import { toEntity } from '@rajkumarganesan93/application';
import type { IProductRepository } from '../../domain/repositories/IProductRepository.js';

export class ProductRepository implements IProductRepository {
  async findOne(criteria: Record<string, unknown>) { /* parameterized WHERE from criteria */ }
  async findMany(criteria: Record<string, unknown>, options?) { /* filtered + paginated */ }
  async count(criteria?) { /* SELECT COUNT(*) with optional WHERE */ }
  async exists(criteria) { /* SELECT EXISTS(...) */ }
  // ... findById, findAll, save, update, delete
}
```

### Step 4: Create use cases

Use `findOne` instead of domain-specific finders like `findByEmail` or `findBySku`. Use `MessageCode` for all errors:

```typescript
import { ConflictError } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';

export class CreateProductUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(input: CreateProductInput) {
    const existing = await this.repo.findOne({ sku: input.sku });
    if (existing) throw new ConflictError(MessageCode.DUPLICATE_ENTRY, { resource: 'Product', field: 'SKU' });
    return this.repo.save(input);
  }
}
```

### Step 5: Create controller

Use `MessageCode` for all success and error responses. Use `parsePaginationFromQuery` for validated pagination:

```typescript
import { parsePaginationFromQuery } from '@rajkumarganesan93/shared';
import { success, error, successPaginated, MessageCode } from '@rajkumarganesan93/api';
import { NotFoundError } from '@rajkumarganesan93/infrastructure';

export class ProductController {
  create = async (req: Request, res: Response) => {
    if (!req.body.name) {
      return res.status(400).json(error(MessageCode.FIELD_REQUIRED, { field: 'name' }));
    }
    const product = await this.createUseCase.execute(req.body);
    return res.status(201).json(success(product, MessageCode.CREATED, { resource: 'Product' }));
  };

  getAll = async (req: Request, res: Response) => {
    const pagination = parsePaginationFromQuery(req.query, {
      allowedSortFields: ['name', 'sku', 'price', 'createdAt'],
    });
    const result = await this.getAllUseCase.execute({ pagination });
    return res.status(200).json(
      successPaginated(result.items, result.meta, MessageCode.LIST_FETCHED, { resource: 'Product' })
    );
  };

  getById = async (req: Request, res: Response) => {
    const product = await this.getByIdUseCase.execute(req.params.id);
    if (!product) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Product' });
    return res.status(200).json(success(product, MessageCode.FETCHED, { resource: 'Product' }));
  };
}
```

### Step 6: Wire up routes and entry point

```typescript
import { asyncHandler } from '@rajkumarganesan93/shared';
import { success, MessageCode } from '@rajkumarganesan93/api';
import { createLogger } from '@rajkumarganesan93/application';
import { errorHandler, requestLogger, NotFoundError } from '@rajkumarganesan93/infrastructure';

const logger = createLogger('product-service');
const app = express();
app.use(express.json());
app.use(requestLogger(logger));
app.use(createRoutes(controller));
app.use((_req, _res, next) => next(new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Route' })));
app.use(errorHandler({ logger }));
```

### Step 7: Add migration

All tables must include `BaseEntity` columns:

```sql
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

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run build` | Build all packages and services |
| `npm run build:packages` | Build packages only (in dependency order) |
| `npm run test` | Run tests across all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run format` | Format with Prettier |
| `npm run migrate:all` | Run all service migrations |
| `npm run migrate:user` | Run user-service migrations |
| `npm run migrate:shared-db-example` | Run shared-db-example migrations |
| `npm run publish:packages` | Build and publish all packages to GitHub Packages |

---

## Publishing packages

### First-time setup

1. Set `GITHUB_TOKEN` environment variable with your PAT:
   ```powershell
   $env:GITHUB_TOKEN = "ghp_your_token_here"
   ```

2. Publish all packages:
   ```bash
   npm run publish:packages
   ```

### Version bumping

```bash
cd packages/domain
npm version patch   # 1.0.0 -> 1.0.1
```

Then publish:

```bash
npm run publish:packages
```

---

## Docker Compose

```bash
docker-compose up --build
```

Postgres runs on port 5432 with databases auto-created via `scripts/init-dbs.sh`. Services are available at their configured ports.

---

## API response format

All APIs return a consistent JSON structure with a `messageCode` field for programmatic handling:

```jsonc
// Success
{
  "success": true,
  "messageCode": "CREATED",
  "message": "User created successfully",
  "data": { "id": "...", "name": "...", "isActive": true, "modifiedAt": "2026-02-23T10:00:00.000Z" },
  "timestamp": "2026-02-23T10:00:00.000Z"
}

// Paginated success
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

### Key rule: No raw strings

Developers must **never** write raw error/success messages. Use `MessageCode` values from `@rajkumarganesan93/api`. The message catalog is controlled centrally and provides:
- Type-safe codes that TypeScript validates at compile time
- Templated messages with `{placeholder}` support (e.g., `{resource}`, `{field}`, `{email}`)
- Consistent `messageCode` field for frontend programmatic handling
- Future i18n/localization support

See the [api package README](packages/api/README.md) for the complete list of available message codes.

---

## License

Private -- CargoEz Platform
