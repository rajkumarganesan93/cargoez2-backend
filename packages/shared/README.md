# @rajkumarganesan93/shared

Minimal shared utilities: database config, Express helpers, pagination parsing, and environment management.

## Installation

```bash
npm install @rajkumarganesan93/shared
```

**Peer dependency:** `express` must be installed in your service.

## What's included

| Export              | Type     | Purpose                                        |
| ------------------- | -------- | ---------------------------------------------- |
| `getDbConfig()`     | function | Read DB_HOST, DB_PORT, etc. from process.env   |
| `getConfig(key, default?)` | function | Read any env variable with fallback     |
| `asyncHandler(fn)`  | function | Wrap async Express handlers (auto-catches)     |
| `healthCheck()`     | function | Returns `{ status: 'ok', timestamp: '...' }`   |
| `parsePaginationFromQuery(query, config?)` | function | Parse and validate pagination from Express query params |
| `DbConfig`          | interface| Shape of database connection config             |
| `AsyncRequestHandler` | type  | Typed async Express handler signature           |
| `PaginationConfig`  | interface| Configuration for parsePaginationFromQuery      |

## Usage

### Pagination parsing

Extract validated pagination parameters from Express query strings. Replaces raw `parseInt` / `as string` casts in controllers.

```typescript
import { parsePaginationFromQuery } from '@rajkumarganesan93/shared';

// In a controller:
const pagination = parsePaginationFromQuery(req.query, {
  defaultLimit: 20,          // default items per page (default: 20)
  maxLimit: 100,             // hard cap on limit (default: 100)
  defaultSortBy: 'createdAt', // fallback sort field (default: 'createdAt')
  defaultSortOrder: 'asc',   // fallback sort direction (default: 'asc')
  allowedSortFields: ['name', 'email', 'createdAt', 'modifiedAt'],
});

const result = await getAllUseCase.execute({ pagination });
```

`PaginationConfig` options:

| Option | Type | Default | Purpose |
| ------ | ---- | ------- | ------- |
| `defaultPage` | number | 1 | Starting page when `?page` is omitted |
| `defaultLimit` | number | 20 | Items per page when `?limit` is omitted |
| `maxLimit` | number | 100 | Maximum allowed limit (values above are clamped) |
| `defaultSortBy` | string | `'createdAt'` | Sort field when `?sortBy` is omitted |
| `defaultSortOrder` | `'asc' \| 'desc'` | `'asc'` | Sort direction when `?sortOrder` is omitted |
| `allowedSortFields` | string[] | (none) | Whitelist of allowed sort fields; unknown values are rejected |

If `allowedSortFields` is provided and the client sends an unknown `sortBy`, it falls back to `defaultSortBy`. If `allowedSortFields` is not provided, any `sortBy` value is accepted.

### Database connection

```typescript
import { Pool } from 'pg';
import { getDbConfig } from '@rajkumarganesan93/shared';

const config = getDbConfig();
export const pool = new Pool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
});
```

This reads from `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=my_service_db
```

### Async handler

Wraps async route handlers so thrown errors are automatically forwarded to Express error middleware:

```typescript
import { asyncHandler } from '@rajkumarganesan93/shared';

router.get('/products', asyncHandler(controller.getAll.bind(controller)));
router.post('/products', asyncHandler(controller.create.bind(controller)));
```

### Config helper

```typescript
import { getConfig } from '@rajkumarganesan93/shared';

const port = getConfig('PORT', '3001');
const secret = getConfig('JWT_SECRET');
```

## Dependencies

- `@rajkumarganesan93/domain` -- PaginationRequest type
- `dotenv` -- loads `.env` into process.env
- `express` (peer) -- handler types
