# @rajkumarganesan93/infrastructure

Express middleware and error classes for standardized error handling across all services.

## Installation

```bash
npm install @rajkumarganesan93/infrastructure
```

**Peer dependency:** `express` must be installed in your service.

## What's included

| Export              | Type       | Purpose                                    |
| ------------------- | ---------- | ------------------------------------------ |
| `AppError`          | class      | Base operational error (extends Error)     |
| `BadRequestError`   | class      | 400 Bad Request                            |
| `UnauthorizedError` | class      | 401 Unauthorized                           |
| `NotFoundError`     | class      | 404 Not Found                              |
| `ConflictError`     | class      | 409 Conflict                               |
| `errorHandler`      | middleware | Express error handler (logs + JSON response)|
| `requestLogger`     | middleware | HTTP request logging via pino              |
| `ErrorHandlerOptions` | interface | Config for errorHandler                  |

## Usage

### Throwing errors in use cases

```typescript
import { NotFoundError, ConflictError, BadRequestError } from '@rajkumarganesan93/infrastructure';

export class CreateProductUseCase {
  async execute(input: CreateProductInput): Promise<Product> {
    if (!input.name) throw new BadRequestError('Product name is required');

    const existing = await this.repo.findBySku(input.sku);
    if (existing) throw new ConflictError('Product with this SKU already exists');

    return this.repo.save(input);
  }
}

export class GetProductUseCase {
  async execute(id: string): Promise<Product> {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }
}
```

### Wiring middleware in your service entry point

```typescript
import express from 'express';
import { createLogger } from '@rajkumarganesan93/application';
import { errorHandler, requestLogger, NotFoundError } from '@rajkumarganesan93/infrastructure';

const logger = createLogger('product-service');
const app = express();

app.use(express.json());
app.use(requestLogger(logger));

// ... mount routes ...

// 404 catch-all (must be after all routes)
app.use((_req, _res, next) => next(new NotFoundError('Not found')));

// Error handler (must be last middleware)
app.use(errorHandler({ logger }));
```

The `errorHandler` middleware:
- Logs 5xx errors at `error` level, 4xx at `warn` level
- Returns a JSON response using the `@rajkumarganesan93/api` error format
- Includes stack trace only in non-production environments

### Custom errors

Extend `AppError` for domain-specific errors:

```typescript
import { AppError } from '@rajkumarganesan93/infrastructure';

export class InsufficientStockError extends AppError {
  constructor(productId: string) {
    super(`Insufficient stock for product ${productId}`, 422);
    this.name = 'InsufficientStockError';
  }
}
```

## Dependencies

- `@rajkumarganesan93/application` -- logger types
- `@rajkumarganesan93/api` -- error response builder
- `express` (peer) -- middleware types
