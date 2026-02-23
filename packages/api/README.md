# @rajkumarganesan93/api

API response builder functions and centralized **Message Catalog** for consistent, type-safe API responses across all services.

## Installation

```bash
npm install @rajkumarganesan93/api
```

## What's included

| Export              | Type     | Purpose                                     |
| ------------------- | -------- | ------------------------------------------- |
| `success(data?, code?, params?)` | function | Build a success response with MessageCode |
| `error(code, params?, stack?)` | function | Build an error response with MessageCode |
| `errorRaw(message, statusCode?, stack?)` | function | Build an error response from a raw string (escape hatch) |
| `successPaginated(items, meta, code?, params?)` | function | Build a paginated success response |
| `MessageCode` | enum | All available message codes |
| `MessageCatalog` | object | Maps MessageCode → HTTP status + message template |
| `resolveMessage(code, params?)` | function | Resolve a code into its status + interpolated message |
| `ApiSuccessResponse` | type | Re-exported from @rajkumarganesan93/domain |
| `ApiErrorResponse` | type | Re-exported from @rajkumarganesan93/domain |
| `ApiResponse` | type | Re-exported from @rajkumarganesan93/domain |
| `PaginatedResult` | type | Re-exported from @rajkumarganesan93/domain |
| `MessageEntry` | type | Shape of a catalog entry |
| `ResolvedMessage` | type | Return shape of resolveMessage() |

## Message Catalog

The message catalog provides a **single source of truth** for all API messages. Developers use `MessageCode` enum values instead of writing raw strings. This ensures:

- **Consistency** — every service returns the same message format
- **Type safety** — TypeScript won't compile unknown codes
- **Frontend-friendly** — frontends can switch on the `messageCode` field
- **i18n-ready** — swap the catalog with locale-specific versions later

### Available message codes

| Code | Status | Default message template |
| ---- | ------ | ----------------------- |
| `CREATED` | 201 | `{resource} created successfully` |
| `UPDATED` | 200 | `{resource} updated successfully` |
| `DELETED` | 200 | `{resource} deleted successfully` |
| `FETCHED` | 200 | `{resource} fetched successfully` |
| `LIST_FETCHED` | 200 | `{resource} list fetched successfully` |
| `BAD_REQUEST` | 400 | `Bad request: {reason}` |
| `VALIDATION_FAILED` | 400 | `Validation failed: {reason}` |
| `FIELD_REQUIRED` | 400 | `{field} is required` |
| `INVALID_INPUT` | 400 | `Invalid input: {reason}` |
| `UNAUTHORIZED` | 401 | `Authentication required` |
| `FORBIDDEN` | 403 | `You do not have permission to perform this action` |
| `INVALID_CREDENTIALS` | 401 | `Invalid credentials` |
| `TOKEN_EXPIRED` | 401 | `Token has expired` |
| `NOT_FOUND` | 404 | `{resource} not found` |
| `CONFLICT` | 409 | `{resource} already exists` |
| `DUPLICATE_ENTRY` | 409 | `{resource} with this {field} already exists` |
| `DUPLICATE_EMAIL` | 409 | `Email {email} is already in use` |
| `INTERNAL_ERROR` | 500 | `An unexpected error occurred` |
| `SERVICE_UNAVAILABLE` | 503 | `Service is temporarily unavailable` |

Placeholders like `{resource}`, `{field}`, `{email}`, `{reason}` are replaced at runtime via the `params` argument.

## Usage

### Success response with MessageCode

```typescript
import { success, MessageCode } from '@rajkumarganesan93/api';

const user = await createUserUseCase.execute(input);
return res.status(201).json(
  success(user, MessageCode.CREATED, { resource: 'User' })
);
// Response:
// {
//   "success": true,
//   "messageCode": "CREATED",
//   "message": "User created successfully",
//   "data": { "id": "...", "name": "..." },
//   "timestamp": "..."
// }
```

### Error response with MessageCode

```typescript
import { error, MessageCode } from '@rajkumarganesan93/api';

if (!req.body.email) {
  return res.status(400).json(
    error(MessageCode.FIELD_REQUIRED, { field: 'email' })
  );
}
// Response:
// {
//   "success": false,
//   "messageCode": "FIELD_REQUIRED",
//   "error": "email is required",
//   "statusCode": 400,
//   "timestamp": "..."
// }
```

### Paginated response with MessageCode

```typescript
import { successPaginated, MessageCode } from '@rajkumarganesan93/api';

const result = await getAllProductsUseCase.execute({ pagination });
return res.status(200).json(
  successPaginated(result.items, result.meta, MessageCode.LIST_FETCHED, { resource: 'Product' })
);
// Response:
// {
//   "success": true,
//   "messageCode": "LIST_FETCHED",
//   "message": "Product list fetched successfully",
//   "data": {
//     "items": [...],
//     "meta": { "total": 150, "page": 1, "limit": 20, "totalPages": 8 }
//   },
//   "timestamp": "..."
// }
```

### Resolving messages manually

```typescript
import { resolveMessage, MessageCode } from '@rajkumarganesan93/api';

const resolved = resolveMessage(MessageCode.DUPLICATE_EMAIL, { email: 'a@b.com' });
// { messageCode: 'DUPLICATE_EMAIL', status: 409, message: 'Email a@b.com is already in use' }
```

### Standard response shapes

All APIs in the platform return one of these shapes:

```typescript
// Success
{
  success: true,
  messageCode?: string,   // e.g. "CREATED", "FETCHED"
  message?: string,       // human-readable resolved message
  data?: T,
  timestamp: string
}

// Error
{
  success: false,
  messageCode?: string,   // e.g. "NOT_FOUND", "DUPLICATE_EMAIL"
  error: string,          // human-readable error message
  statusCode: number,
  timestamp: string,
  stack?: string           // only in non-production
}
```

## Dependencies

- `@rajkumarganesan93/domain` — response type definitions
