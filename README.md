# cargoez2-backend

Node.js microservices monorepo with PostgreSQL, Clean Architecture, and publishable shared packages.

## Architecture

```
cargoez2-backend/
├── packages/                    # Publishable @cargoez2/* packages
│   ├── domain/                  # BaseEntity, IRepository, API types, ColumnMap
│   ├── application/             # Mapper, Audit, Logger
│   ├── infrastructure/          # Error handler, AppError classes
│   ├── api/                     # success(), error(), successPaginated()
│   ├── shared/                  # getDbConfig, asyncHandler, healthCheck
│   └── integrations/            # Email & notification interfaces + stubs
├── services/
│   ├── user-service/            # CRUD APIs (port 3001)
│   └── auth-service/            # Login, register, token APIs (port 3003)
├── .npmrc                       # GitHub Packages registry config
├── docker-compose.yml
└── package.json                 # npm workspaces root
```

### Package dependency graph

```
@cargoez2/shared        (no deps)
@cargoez2/domain        (no deps)
@cargoez2/api           → domain
@cargoez2/application   → domain, shared
@cargoez2/infrastructure → application, api, domain
@cargoez2/integrations  → shared
```

### Clean Architecture layers (per service)

```
Domain          → entities (extend BaseEntity), repository interfaces
Application     → use cases, orchestration logic
Infrastructure  → db.ts (pg pool), repository implementations
Presentation    → controllers, routes (with Swagger JSDoc), swagger.ts
```

---

## Quick start (local development)

### Prerequisites

- Node.js >= 18
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

Or via script:

```bash
psql -U postgres -f scripts/create-databases.sql
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
npm run dev -w @cargoez-be/auth-service
```

### 6. Verify

| Service      | Health check                    | Swagger docs                     |
| ------------ | ------------------------------- | -------------------------------- |
| user-service | http://localhost:3001/health    | http://localhost:3001/api-docs   |
| auth-service | http://localhost:3003/health    | http://localhost:3003/api-docs   |

---

## Packages

All packages are published to [GitHub Packages](https://github.com/rajkumarganesan93/cargoez2-backend/packages) under the `@cargoez2` scope.

| Package | Purpose | README |
| ------- | ------- | ------ |
| `@cargoez2/domain` | Core types: BaseEntity, IRepository, pagination, API response types, ColumnMap | [packages/domain/README.md](packages/domain/README.md) |
| `@cargoez2/application` | Entity mapper (toEntity/toRow), audit service, pino logger | [packages/application/README.md](packages/application/README.md) |
| `@cargoez2/infrastructure` | AppError classes, errorHandler/requestLogger middleware | [packages/infrastructure/README.md](packages/infrastructure/README.md) |
| `@cargoez2/api` | Response helpers: success(), error(), successPaginated() | [packages/api/README.md](packages/api/README.md) |
| `@cargoez2/shared` | getDbConfig, getConfig, asyncHandler, healthCheck | [packages/shared/README.md](packages/shared/README.md) |
| `@cargoez2/integrations` | IEmailProvider, INotificationProvider + stub implementations | [packages/integrations/README.md](packages/integrations/README.md) |

---

## Installing packages

### 1. Create `.npmrc` in your project root

```
@cargoez2:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Or use an environment variable:

```
@cargoez2:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 2. Install packages

```bash
npm install @cargoez2/domain @cargoez2/application @cargoez2/infrastructure @cargoez2/api @cargoez2/shared
```

---

## Developer guide: building a new service

Follow this guide when creating a new microservice that uses the `@cargoez2` packages.

### Step 1: Define your entity

```typescript
// src/domain/entities/Product.ts
import type { BaseEntity } from '@cargoez2/domain';

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  price: number;
}
```

### Step 2: Define repository interface

```typescript
// src/domain/repositories/IProductRepository.ts
import type { PaginatedResult, ListOptions } from '@cargoez2/domain';
import type { Product } from '../entities/Product.js';

export interface CreateProductInput { name: string; sku: string; price: number; }
export interface UpdateProductInput { name?: string; price?: number; }

export interface IProductRepository {
  findAll(options?: ListOptions): Promise<PaginatedResult<Product>>;
  findById(id: string): Promise<Product | null>;
  save(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}
```

### Step 3: Implement repository

```typescript
// src/infrastructure/repositories/ProductRepository.ts
import { pool } from '../db.js';
import { toEntity } from '@cargoez2/application';
import type { ListOptions } from '@cargoez2/domain';
import type { Product } from '../../domain/entities/Product.js';
import type { IProductRepository, CreateProductInput, UpdateProductInput } from '../../domain/repositories/IProductRepository.js';

const COLUMNS = 'id, name, sku, price, created_at, is_active, modified_at, created_by, modified_by, tenant_id';

export class ProductRepository implements IProductRepository {
  async findAll(options?: ListOptions) {
    const page = options?.pagination?.page ?? 1;
    const limit = Math.min(options?.pagination?.limit ?? 100, 500);
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int FROM products WHERE is_active = true');
    const total = countResult.rows[0]?.count ?? 0;

    const result = await pool.query(
      `SELECT ${COLUMNS} FROM products WHERE is_active = true ORDER BY created_at ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      items: result.rows.map((row) => toEntity<Product>(row as Record<string, unknown>)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findById(id: string) {
    const result = await pool.query(`SELECT ${COLUMNS} FROM products WHERE id = $1`, [id]);
    return result.rows[0] ? toEntity<Product>(result.rows[0] as Record<string, unknown>) : null;
  }

  async save(input: CreateProductInput) {
    const result = await pool.query(
      `INSERT INTO products (name, sku, price) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
      [input.name, input.sku, input.price]
    );
    return toEntity<Product>(result.rows[0] as Record<string, unknown>);
  }

  // ... update, delete
}
```

### Step 4: Create use cases

```typescript
// src/application/use-cases/CreateProductUseCase.ts
import { ConflictError } from '@cargoez2/infrastructure';
import type { IProductRepository } from '../../domain/repositories/IProductRepository.js';

export class CreateProductUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(input: { name: string; sku: string; price: number }) {
    return this.repo.save(input);
  }
}
```

### Step 5: Create controller

```typescript
// src/presentation/controllers/ProductController.ts
import { NotFoundError } from '@cargoez2/infrastructure';
import { success, error, successPaginated } from '@cargoez2/api';

export class ProductController {
  // constructor with use cases...

  getAll = async (req: Request, res: Response) => {
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = parseInt(String(req.query.limit), 10) || 100;
    const result = await this.getAllUseCase.execute({ pagination: { page, limit } });
    return res.status(200).json(successPaginated(result.items, result.meta));
  };

  create = async (req: Request, res: Response) => {
    const product = await this.createUseCase.execute(req.body);
    return res.status(201).json(success(product));
  };
}
```

### Step 6: Wire up routes and entry point

```typescript
// src/presentation/routes.ts
import { asyncHandler } from '@cargoez2/shared';
import { success } from '@cargoez2/api';

export function createRoutes(controller: ProductController) {
  const router = Router();
  router.get('/health', (_req, res) => res.json(success({ status: 'ok' })));
  router.get('/products', asyncHandler(controller.getAll.bind(controller)));
  router.post('/products', asyncHandler(controller.create.bind(controller)));
  return router;
}
```

```typescript
// src/index.ts
import { createLogger } from '@cargoez2/application';
import { errorHandler, requestLogger, NotFoundError } from '@cargoez2/infrastructure';

const logger = createLogger('product-service');
const app = express();
app.use(express.json());
app.use(requestLogger(logger));
app.use(createRoutes(controller));
app.use((_req, _res, next) => next(new NotFoundError('Not found')));
app.use(errorHandler({ logger }));
```

### Step 7: Add migration

```sql
-- migrations/001_init.sql
-- Author: YourName
-- Date: 2026-02-23
-- Description: Initial products table

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    tenant_id VARCHAR(255)
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
| `npm run migrate:auth` | Run auth-service migrations |
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

Before publishing a new version, bump the version in the package's `package.json`:

```bash
cd packages/domain
npm version patch   # 1.0.0 -> 1.0.1
# or: npm version minor  # 1.0.0 -> 1.1.0
# or: npm version major  # 1.0.0 -> 2.0.0
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

All APIs return a consistent JSON structure:

```jsonc
// Success
{ "success": true, "data": { ... }, "timestamp": "2026-02-23T10:00:00.000Z" }

// Paginated success
{ "success": true, "data": { "items": [...], "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 } }, "timestamp": "..." }

// Error
{ "success": false, "error": "Not found", "statusCode": 404, "timestamp": "..." }
```

---

## License

Private -- CargoEz Platform
