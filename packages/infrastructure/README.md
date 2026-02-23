# @rajkumarganesan93/infrastructure

Express middleware and error classes for standardized error handling across all services. Integrated with the **Message Catalog** from `@rajkumarganesan93/api`.

## Installation

```bash
npm install @rajkumarganesan93/infrastructure
```

**Peer dependency:** `express` must be installed in your service.

## What's included

| Export              | Type       | Purpose                                    |
| ------------------- | ---------- | ------------------------------------------ |
| `BaseRepository`    | class      | Generic Knex-powered repo implementing IRepository |
| `AppError`          | class      | Base operational error (supports MessageCode) |
| `BadRequestError`   | class      | 400 Bad Request                            |
| `UnauthorizedError` | class      | 401 Unauthorized                           |
| `ForbiddenError`    | class      | 403 Forbidden                              |
| `NotFoundError`     | class      | 404 Not Found                              |
| `ConflictError`     | class      | 409 Conflict                               |
| `errorHandler`      | middleware | Express error handler (logs + JSON response) |
| `requestLogger`     | middleware | HTTP request logging via pino              |
| `ErrorHandlerOptions` | interface | Config for errorHandler                  |

## Usage

### BaseRepository (Knex-powered generic repository)

`BaseRepository` implements all 9 `IRepository` methods using Knex and the `ColumnMap` system. Service-specific repositories extend it with just configuration — no raw SQL needed.

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

| Parameter       | Type       | Purpose                                               |
| --------------- | ---------- | ----------------------------------------------------- |
| `knex`          | `Knex`     | Knex instance (from `createKnex()`)                   |
| `table`         | `string`   | Database table name                                   |
| `columnMap`     | `ColumnMap`| Maps entity properties (camelCase) to DB columns      |
| `writableFields`| `string[]` | Entity properties that are user-writable              |

**Note:** `delete()` performs a soft-delete (sets `is_active=false`). `mapCriteria` throws on unknown criteria keys.

**For complex queries** (JOINs, transactions), access the protected `this.knex` instance directly:

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

### Throwing errors with MessageCode (recommended)

All error classes accept either a `MessageCode` or a plain string. **Always prefer MessageCode** so responses include a structured `messageCode` field.

```typescript
import { NotFoundError, ConflictError, BadRequestError } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';

export class CreateProductUseCase {
  async execute(input: CreateProductInput): Promise<Product> {
    const existing = await this.repo.findOne({ sku: input.sku });
    if (existing) {
      throw new ConflictError(MessageCode.DUPLICATE_ENTRY, { resource: 'Product', field: 'SKU' });
      // → 409: { messageCode: "DUPLICATE_ENTRY", error: "Product with this SKU already exists" }
    }
    return this.repo.save(input);
  }
}

export class GetProductUseCase {
  async execute(id: string): Promise<Product> {
    const product = await this.repo.findById(id);
    if (!product) {
      throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Product' });
      // → 404: { messageCode: "NOT_FOUND", error: "Product not found" }
    }
    return product;
  }
}
```

### Throwing errors with plain strings (legacy/escape hatch)

```typescript
throw new BadRequestError('Custom validation message');
// → 400: { error: "Custom validation message" } (no messageCode)
```

### Wiring middleware in your service entry point

```typescript
import express from 'express';
import { createLogger } from '@rajkumarganesan93/application';
import { errorHandler, requestLogger, NotFoundError } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';

const logger = createLogger('product-service');
const app = express();

app.use(express.json());
app.use(requestLogger(logger));

// ... mount routes ...

// 404 catch-all (must be after all routes)
app.use((_req, _res, next) =>
  next(new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Route' }))
);

// Error handler (must be last middleware)
app.use(errorHandler({ logger }));
```

The `errorHandler` middleware:
- **JSON parse errors** — malformed request bodies return 400 with `messageCode: BAD_REQUEST`
- **PayloadTooLarge** — oversized bodies return 413
- **AppError with MessageCode** — structured response with `messageCode` + resolved message
- **AppError without MessageCode** — for statusCode ≥ 500, returns generic `INTERNAL_ERROR` (no raw message leak); otherwise falls back to the raw error message
- **Unrecognized errors** — responds with `MessageCode.INTERNAL_ERROR`
- Logs 5xx at `error` level, 4xx at `warn` level
- Stack traces included only in non-production environments

### Error response examples

```jsonc
// AppError with MessageCode
{
  "success": false,
  "messageCode": "NOT_FOUND",
  "error": "Product not found",
  "statusCode": 404,
  "timestamp": "2026-02-23T08:00:00.000Z"
}

// Unhandled error (no MessageCode)
{
  "success": false,
  "messageCode": "INTERNAL_ERROR",
  "error": "An unexpected error occurred",
  "statusCode": 500,
  "timestamp": "2026-02-23T08:00:00.000Z"
}
```

## Dependencies

- `@rajkumarganesan93/application` — logger, EntityMapper (toEntity); no longer depends on `@rajkumarganesan93/shared`
- `@rajkumarganesan93/domain` — IRepository, ColumnMap, pagination types
- `@rajkumarganesan93/api` — MessageCode, error response builder
- `knex` — SQL query builder for BaseRepository
- `express` (peer) — middleware types
- `pino` (peer) — request logging
