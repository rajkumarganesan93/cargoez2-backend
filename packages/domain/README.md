# @cargoez2/domain

Core domain types and interfaces for the CargoEz platform. This package contains no business logic or framework dependencies -- only pure TypeScript types.

## Installation

```bash
npm install @cargoez2/domain
```

Requires `.npmrc` configuration (see [root README](../../README.md#installing-packages)).

## What's included

| Export              | Type      | Purpose                                      |
| ------------------- | --------- | -------------------------------------------- |
| `BaseEntity`        | interface | Common audit fields for all entities          |
| `IRepository`       | interface | Generic CRUD repository contract              |
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
import type { BaseEntity } from '@cargoez2/domain';

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  price: number;
  categoryId: string;
}
```

`BaseEntity` provides these fields automatically:

```typescript
interface BaseEntity {
  id: string;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date;
  createdBy?: string;
  modifiedBy?: string;
  tenantId?: string;
}
```

### Define a repository interface

```typescript
import type { IRepository } from '@cargoez2/domain';
import type { Product } from '../entities/Product.js';

interface CreateProductInput {
  name: string;
  sku: string;
  price: number;
  categoryId: string;
}

interface UpdateProductInput {
  name?: string;
  price?: number;
}

export interface IProductRepository extends IRepository<Product, CreateProductInput, UpdateProductInput> {
  findBySku(sku: string): Promise<Product | null>;
}
```

`IRepository` gives you `findById`, `findAll` (paginated), `save`, `update`, `delete` out of the box.

### Pagination

Use `ListOptions` for list endpoints and return `PaginatedResult`:

```typescript
import type { ListOptions, PaginatedResult } from '@cargoez2/domain';

async function listProducts(options?: ListOptions): Promise<PaginatedResult<Product>> {
  // options.pagination = { page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' }
  // options.filters = { categoryId: 'abc-123' }
}
```

### API response types

All API responses follow the same shape:

```typescript
// Success: { success: true, data: ..., timestamp: '...' }
// Error:   { success: false, error: '...', statusCode: 400, timestamp: '...' }
```

### Column mapping

Map entity properties to DB columns for security/obfuscation:

```typescript
import type { ColumnMap } from '@cargoez2/domain';

const productColumnMap: ColumnMap = {
  name: 'prd_nm',
  sku: 'prd_sku',
  price: 'prd_prc',
  categoryId: 'cat_id',
};
```

When no `ColumnMap` is provided, the mapper defaults to `snake_case` conversion (e.g., `createdAt` -> `created_at`).

## Rules

1. **Entities use camelCase only** -- never snake_case in entity interfaces
2. **No framework imports** -- domain package must stay pure (no Express, pg, etc.)
3. **Extend BaseEntity** -- every entity must extend it; the DB migration must include the corresponding columns
