# @rajkumarganesan93/application

Application-layer utilities: entity-to-DB mapping, audit service, and structured logging.

## Installation

```bash
npm install @rajkumarganesan93/application
```

## What's included

| Export                    | Type     | Purpose                                        |
| ------------------------- | -------- | ---------------------------------------------- |
| `toEntity(row, map?)`     | function | Convert a DB row (snake_case) to entity (camelCase) |
| `toRow(entity, map?)`     | function | Convert an entity (camelCase) to DB row            |
| `createLogger(name)`      | function | Create a pino logger for a service                 |
| `logger`                  | object   | Default logger instance                            |
| `AuditService`            | class    | Records audit trail entries                        |
| `InMemoryAuditRepository` | class    | In-memory audit store (dev/test); exposes `getEntries()`, `findById()`, `findByEntity()` |
| `IAuditRepository`        | interface| Contract for persistent audit storage              |
| `AuditEntry`              | interface| Shape of an audit record                           |
| `AuditRecordInput`        | interface| Input for recording an audit entry                 |

## Usage

### Entity mapper

The mapper converts between DB rows (snake_case columns) and domain entities (camelCase properties).

```typescript
import { toEntity, toRow } from '@rajkumarganesan93/application';
import type { ColumnMap } from '@rajkumarganesan93/domain';
import type { Product } from '../domain/entities/Product.js';

// Optional: custom column aliases for security
const productMap: ColumnMap = {
  name: 'prd_nm',
  sku: 'prd_sku',
};

// DB row -> Entity
const dbRow = { id: '...', prd_nm: 'Widget', prd_sku: 'W-001', created_at: '2025-02-23T12:00:00.000Z' };
const product = toEntity<Product>(dbRow, productMap);
// Result: { id: '...', name: 'Widget', sku: 'W-001', createdAt: string }

// Entity -> DB row
const row = toRow(product, productMap);
// Result: { id: '...', prd_nm: 'Widget', prd_sku: 'W-001', created_at: string }
```

Without a ColumnMap, the mapper uses default snake_case conversion:

```typescript
const row = { user_id: '123', created_at: '2025-02-23T12:00:00.000Z' };
const entity = toEntity(row);
// Result: { userId: '123', createdAt: string }
```

### Logger

```typescript
import { createLogger } from '@rajkumarganesan93/application';

const logger = createLogger('product-service');
logger.info({ productId: '123' }, 'Product created');
logger.error({ err }, 'Failed to save product');
```

The logger uses [pino](https://getpino.io/) with structured JSON output in production and pretty-printing in development (when `NODE_ENV !== 'production'`).

### Audit service

```typescript
import { AuditService, InMemoryAuditRepository } from '@rajkumarganesan93/application';

const auditRepo = new InMemoryAuditRepository();
const auditService = new AuditService(auditRepo);

await auditService.record({
  action: 'CREATE',
  entityType: 'Product',
  entityId: '123',
  userId: 'user-456',
  serviceName: 'product-service',
  metadata: { sku: 'W-001' },
});
```

For production, implement `IAuditRepository` with a real database:

```typescript
import type { IAuditRepository } from '@rajkumarganesan93/application';

export class PostgresAuditRepository implements IAuditRepository {
  async save(entry: AuditEntry): Promise<void> {
    await pool.query('INSERT INTO audit_log (...) VALUES (...)', [...]);
  }
  async findByEntityId(entityId: string): Promise<AuditEntry[]> { /* ... */ }
  async findByUserId(userId: string): Promise<AuditEntry[]> { /* ... */ }
}
```

## Dependencies

- `@rajkumarganesan93/domain` -- BaseEntity, ColumnMap types
- `pino` -- logging (`pino-pretty` is a devDependency for pretty-printing in development)
