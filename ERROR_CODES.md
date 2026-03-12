# Error & Message Codes Reference

All API responses include a `messageCode` field that indicates the outcome.
Codes are defined in `@cargoez/api` → `MessageCode` enum and resolved via `MessageCatalog`.

---

## Unified Response Envelope

Every response — success or error — follows this shape:

```typescript
interface ApiResponse<T = any> {
  success: boolean;       // true for success, false for error
  messageCode: string;    // MessageCode enum value
  message: string;        // Human-readable message from MessageCatalog
  data?: T;               // Present on success
  errors?: any[];         // Present on error (validation details, etc.)
}
```

---

## Success Codes

| Code | HTTP Status | Message | When Used |
|------|-------------|---------|-----------|
| `SUCCESS` | 200 | Operation completed successfully | Generic success |
| `CREATED` | 201 | Resource created successfully | `POST` — new resource created |
| `UPDATED` | 200 | Resource updated successfully | `PUT` — existing resource modified |
| `DELETED` | 200 | Resource deleted successfully | `DELETE` — resource removed |
| `FETCHED` | 200 | Resource fetched successfully | `GET /:id` — single resource retrieved |
| `LIST_FETCHED` | 200 | Resources fetched successfully | `GET /` — paginated list retrieved |

### Example — Success (Single Resource)

```json
{
  "success": true,
  "messageCode": "CREATED",
  "message": "Resource created successfully",
  "data": {
    "id": "d563b61c-7961-4431-8c7f-f57bbc010943",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "createdAt": "2026-03-04T08:44:32.110Z",
    "modifiedAt": "2026-03-04T08:44:32.110Z",
    "createdBy": "admin",
    "modifiedBy": "admin",
    "tenantId": null
  }
}
```

### Example — Success (Paginated List)

```json
{
  "success": true,
  "messageCode": "LIST_FETCHED",
  "message": "Resources fetched successfully",
  "data": {
    "data": [
      { "id": "uuid-1", "name": "Alice", "email": "alice@example.com", ... },
      { "id": "uuid-2", "name": "Bob", "email": "bob@example.com", ... }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "totalPages": 5
    }
  }
}
```

### Example — Delete

```json
{
  "success": true,
  "messageCode": "DELETED",
  "message": "Resource deleted successfully",
  "data": null
}
```

---

## Validation Error Codes (422)

| Code | HTTP Status | Message | When Used |
|------|-------------|---------|-----------|
| `VALIDATION_FAILED` | 422 | Validation failed | DTO validation failed (class-validator) |
| `FIELD_REQUIRED` | 422 | Required field is missing | A required field was not provided |
| `INVALID_INPUT` | 422 | Invalid input provided | Input format is wrong (bad UUID, invalid enum) |

**Thrown by:** NestJS `ValidationPipe` with `class-validator` decorators on DTOs.

### Example — Validation Error

```json
{
  "success": false,
  "messageCode": "VALIDATION_FAILED",
  "message": "Validation failed",
  "errors": [
    {
      "property": "email",
      "constraints": {
        "isEmail": "email must be an email"
      }
    }
  ]
}
```

---

## Authentication & Authorization Codes

| Code | HTTP Status | Message | When Used |
|------|-------------|---------|-----------|
| `UNAUTHORIZED` | 401 | Unauthorized access | Missing `Authorization` header, invalid/expired JWT |
| `FORBIDDEN` | 403 | Access forbidden | Valid token but user lacks required role |

**Thrown by:**
- `JwtAuthGuard` → `UNAUTHORIZED` (missing or invalid token)
- `PermissionsGuard` → `FORBIDDEN` (user lacks required `@RequirePermission()`)

### Example — Unauthorized

```json
{
  "success": false,
  "messageCode": "UNAUTHORIZED",
  "message": "Missing or invalid authorization header"
}
```

### Example — Forbidden

```json
{
  "success": false,
  "messageCode": "FORBIDDEN",
  "message": "Access forbidden"
}
```

---

## Resource Error Codes

| Code | HTTP Status | Message | When Used |
|------|-------------|---------|-----------|
| `NOT_FOUND` | 404 | Resource not found | `findById` returned null |
| `ALREADY_EXISTS` | 409 | Resource already exists | Unique constraint violation |

**Thrown by:** Use case classes via `NotFoundException` and `AlreadyExistsException`.

### Example — Not Found

```json
{
  "success": false,
  "messageCode": "NOT_FOUND",
  "message": "Resource not found",
  "errors": ["User not found"]
}
```

### Example — Already Exists

```json
{
  "success": false,
  "messageCode": "ALREADY_EXISTS",
  "message": "Resource already exists",
  "errors": ["User already exists"]
}
```

---

## Server Error Codes

| Code | HTTP Status | Message | When Used |
|------|-------------|---------|-----------|
| `INTERNAL_ERROR` | 500 | Internal server error | Unhandled exception |

All unhandled exceptions are caught by `GlobalExceptionFilter`, logged with full stack trace via Pino, and returned as a clean `INTERNAL_ERROR` response. The raw error message is included in the response for debugging (in production, you may want to strip it).

### Example — Internal Error

```json
{
  "success": false,
  "messageCode": "INTERNAL_ERROR",
  "message": "Internal server error"
}
```

---

## Exception Classes

Use these in your use cases and services to throw typed errors:

```typescript
import { NotFoundException, AlreadyExistsException, ValidationException } from '@cargoez/api';

// 404
throw new NotFoundException('User');
// → { success: false, messageCode: "NOT_FOUND", message: "Resource not found", errors: ["User not found"] }

// 409
throw new AlreadyExistsException('User');
// → { success: false, messageCode: "ALREADY_EXISTS", message: "Resource already exists", errors: ["User already exists"] }

// 422
throw new ValidationException([{ field: 'email', message: 'Invalid format' }]);
// → { success: false, messageCode: "VALIDATION_FAILED", message: "Validation failed", errors: [...] }
```

---

## Adding New Codes

1. Add the code to `MessageCode` enum in `libs/api/src/messages/message-code.enum.ts`
2. Add the entry to `MessageCatalog` map in `libs/api/src/messages/message-catalog.ts`
3. Optionally create an `AppException` subclass in `libs/api/src/exceptions/app.exceptions.ts`
4. Update this document

---

## Related Documentation

- [PACKAGES.md](./PACKAGES.md) — Full library reference with all exports
- [AUTHENTICATION.md](./AUTHENTICATION.md) — Auth flows, token management
- [DEVELOPMENT.md](./DEVELOPMENT.md) — Development guide, coding conventions
