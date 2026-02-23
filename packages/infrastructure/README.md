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
| `AppError`          | class      | Base operational error (supports MessageCode) |
| `BadRequestError`   | class      | 400 Bad Request                            |
| `UnauthorizedError` | class      | 401 Unauthorized                           |
| `NotFoundError`     | class      | 404 Not Found                              |
| `ConflictError`     | class      | 409 Conflict                               |
| `errorHandler`      | middleware | Express error handler (logs + JSON response) |
| `requestLogger`     | middleware | HTTP request logging via pino              |
| `ErrorHandlerOptions` | interface | Config for errorHandler                  |

## Usage

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
- Logs 5xx errors at `error` level, 4xx at `warn` level
- If the error has a `messageCode`, builds a structured response with `messageCode` + resolved message
- If the error has no `messageCode`, falls back to the raw error message
- For unrecognized errors (non-AppError), responds with `MessageCode.INTERNAL_ERROR`
- Includes stack trace only in non-production environments

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

- `@rajkumarganesan93/application` — logger types
- `@rajkumarganesan93/api` — MessageCode, error response builder
- `express` (peer) — middleware types
