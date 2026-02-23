# @rajkumarganesan93/shared

Minimal shared utilities: database config, Express helpers, and environment management.

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
| `DbConfig`          | interface| Shape of database connection config             |
| `AsyncRequestHandler` | type  | Typed async Express handler signature           |

## Usage

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

Without `asyncHandler`, you'd need try/catch in every async handler.

### Config helper

```typescript
import { getConfig } from '@rajkumarganesan93/shared';

const port = getConfig('PORT', '3001');
const secret = getConfig('JWT_SECRET');
```

## Dependencies

- `dotenv` -- loads `.env` into process.env
- `express` (peer) -- handler types
