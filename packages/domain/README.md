# @rajkumarganesan93/domain

Core domain types and interfaces for the CargoEz platform. This package contains no business logic or framework dependencies -- only pure TypeScript types.

## Installation

```bash
npm install @rajkumarganesan93/domain
```

Requires `.npmrc` configuration (see [root README](../../README.md#installing-packages)).

## What's included

| Export              | Type      | Purpose                                      |
| ------------------- | --------- | -------------------------------------------- |
| `BaseEntity`        | interface | Common audit fields for all entities          |
| `IRepository`       | interface | Generic repository contract (9 methods)       |
| `PaginationRequest` | interface | Page, limit, sort params for list queries     |
| `PaginatedResult`   | interface | Paginated response with items + meta          |
| `ListOptions`       | interface | Pagination + filters for findAll              |
| `RequestEnvelope`   | interface | Standard request wrapper (tenant, pagination) |
| `ApiSuccessResponse`| interface | Uniform success response shape                |
| `ApiErrorResponse`  | interface | Uniform error response shape                  |
| `ApiResponse`       | type      | Union of success and error responses          |
| `ColumnMap`         | type      | Entity prop (camelCase) -> DB column mapping  |

## Usage

### Define an entity

Every domain entity must extend `BaseEntity`. Entity properties always use **camelCase**.

```typescript
import type { BaseEntity } from '@rajkumarganesan93/domain';

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  price: number;
}
```

`BaseEntity` provides these fields automatically:

```typescript
interface BaseEntity {
  id: string;
  isActive: boolean;
  createdAt: string;   // ISO 8601
  modifiedAt: string; // ISO 8601
  createdBy?: string;
  modifiedBy?: string;
  tenantId?: string;
}
```

Date fields (`createdAt`, `modifiedAt`) are ISO 8601 strings, not `Date` objects.

### Define a repository interface

All service repositories **must** extend `IRepository`. Do not create standalone repository interfaces with ad-hoc `findByX` methods.

```typescript
import type { IRepository } from '@rajkumarganesan93/domain';
import type { Product } from '../entities/Product.js';

interface CreateProductInput { name: string; sku: string; price: number; }
interface UpdateProductInput { name?: string; price?: number; }

// Correct: extends IRepository
export interface IProductRepository extends IRepository<Product, CreateProductInput, UpdateProductInput> {}
```

### IRepository methods

`IRepository<T, CreateInput, UpdateInput>` provides 9 methods:

| Method | Signature | Purpose |
| ------ | --------- | ------- |
| `findById` | `(id: string) => Promise<T \| null>` | Fetch a single record by primary key |
| `findAll` | `(options?: ListOptions) => Promise<PaginatedResult<T>>` | Paginated list of all records |
| `findOne` | `(criteria: Record<string, unknown>) => Promise<T \| null>` | Find first record matching criteria |
| `findMany` | `(criteria: Record<string, unknown>, options?: ListOptions) => Promise<PaginatedResult<T>>` | Filtered paginated list |
| `save` | `(input: CreateInput) => Promise<T>` | Create a new record |
| `update` | `(id: string, input: UpdateInput) => Promise<T \| null>` | Update a record by ID |
| `delete` | `(id: string) => Promise<boolean>` | Soft-delete a record by ID (sets isActive=false) |
| `count` | `(criteria?: Record<string, unknown>) => Promise<number>` | Count records matching criteria |
| `exists` | `(criteria: Record<string, unknown>) => Promise<boolean>` | Check if any record matches |

Instead of domain-specific methods like `findByEmail` or `findBySku`, use the generic `findOne`:

```typescript
// Instead of: repo.findByEmail('user@example.com')
const user = await repo.findOne({ email: 'user@example.com' });

// Instead of: repo.findBySku('W-001')
const product = await repo.findOne({ sku: 'W-001' });

// Check for duplicates before saving:
const exists = await repo.exists({ email: input.email });
if (exists) throw new ConflictError('Email already in use');
```

### Pagination

Use `ListOptions` for list endpoints and return `PaginatedResult`:

```typescript
import type { ListOptions, PaginatedResult } from '@rajkumarganesan93/domain';

async function listProducts(options?: ListOptions): Promise<PaginatedResult<Product>> {
  // options.pagination = { page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' }
  // options.filters = { categoryId: 'abc-123' }
}
```

### Column mapping

Map entity properties to DB columns for security/obfuscation:

```typescript
import type { ColumnMap } from '@rajkumarganesan93/domain';

const productColumnMap: ColumnMap = {
  name: 'prd_nm',
  sku: 'prd_sku',
  price: 'prd_prc',
};
```

When no `ColumnMap` is provided, the mapper defaults to `snake_case` conversion (e.g., `createdAt` -> `created_at`).

## Rules

1. **Entities use camelCase only** -- never snake_case in entity interfaces
2. **No framework imports** -- domain package must stay pure (no Express, pg, etc.)
3. **Extend BaseEntity** -- every entity must extend it; the DB migration must include the corresponding columns
4. **Extend IRepository** -- every service repository interface must extend `IRepository`; do not define standalone CRUD interfaces
5. **Use findOne for lookups** -- use `findOne({ field: value })` instead of bespoke `findByField` methods
