# Error & Message Codes Reference

All API responses include a `messageCode` field that indicates the outcome.
Codes are defined in `@rajkumarganesan93/api` → `MessageCode` enum and resolved via `MessageCatalog`.

---

## Success Codes

| Code | HTTP Status | Message Template | When Used |
|------|-------------|-----------------|-----------|
| `CREATED` | 201 | `{resource} created successfully` | A new resource was created (POST) |
| `UPDATED` | 200 | `{resource} updated successfully` | An existing resource was modified (PUT/PATCH) |
| `DELETED` | 200 | `{resource} deleted successfully` | A resource was soft-deleted (DELETE) |
| `FETCHED` | 200 | `{resource} fetched successfully` | A single resource was retrieved (GET /:id) |
| `LIST_FETCHED` | 200 | `{resource} list fetched successfully` | A paginated list was retrieved (GET /) |

### Example — Success Response

```json
{
  "success": true,
  "messageCode": "CREATED",
  "message": "User created successfully",
  "data": {
    "id": "a1b2c3d4-...",
    "name": "Alice",
    "email": "alice@example.com",
    "isActive": true,
    "createdAt": "2026-02-19T10:00:00.000Z",
    "modifiedAt": "2026-02-19T10:00:00.000Z"
  },
  "timestamp": "2026-02-19T10:00:00.123Z"
}
```

---

## Bad Request (400)

| Code | HTTP Status | Message Template | When Used |
|------|-------------|-----------------|-----------|
| `BAD_REQUEST` | 400 | `Bad request: {reason}` | Request syntax is malformed (invalid JSON, wrong content-type) |

### Example — Bad Request

```json
{
  "success": false,
  "messageCode": "BAD_REQUEST",
  "error": "Bad request: Malformed JSON",
  "statusCode": 400,
  "timestamp": "2026-02-19T10:00:00.123Z"
}
```

---

## Validation Error Codes (422)

Per RFC 4918, **422 Unprocessable Entity** is used when the server understands the request syntax but the content fails semantic validation. This is distinct from 400 which indicates malformed syntax.

| Code | HTTP Status | Message Template | When Used |
|------|-------------|-----------------|-----------|
| `VALIDATION_FAILED` | 422 | `Validation failed: {reason}` | Request body/params/query failed Zod schema validation |
| `FIELD_REQUIRED` | 422 | `{field} is required` | A specific required field is missing |
| `INVALID_INPUT` | 422 | `Invalid input: {reason}` | Input is present but invalid (bad UUID format, invalid params) |

### Example — Validation Error

```json
{
  "success": false,
  "messageCode": "VALIDATION_FAILED",
  "error": "Validation failed: name: name is required; email: invalid email format",
  "statusCode": 422,
  "timestamp": "2026-02-19T10:00:00.123Z"
}
```

### Example — Invalid Input

```json
{
  "success": false,
  "messageCode": "INVALID_INPUT",
  "error": "Invalid input: id: id must be a valid UUID",
  "statusCode": 422,
  "timestamp": "2026-02-19T10:00:00.123Z"
}
```

---

## Authentication & Authorization Codes

| Code | HTTP Status | Message Template | When Used |
|------|-------------|-----------------|-----------|
| `UNAUTHORIZED` | 401 | `Authentication required` | No valid authentication token provided |
| `FORBIDDEN` | 403 | `You do not have permission to perform this action` | User is authenticated but lacks permission |
| `INVALID_CREDENTIALS` | 401 | `Invalid credentials` | Login attempt with wrong username/password |
| `TOKEN_EXPIRED` | 401 | `Token has expired` | JWT or session token has expired |

### Example — Unauthorized

```json
{
  "success": false,
  "messageCode": "UNAUTHORIZED",
  "error": "Authentication required",
  "statusCode": 401,
  "timestamp": "2026-02-19T10:00:00.123Z"
}
```

---

## Resource Error Codes

| Code | HTTP Status | Message Template | When Used |
|------|-------------|-----------------|-----------|
| `NOT_FOUND` | 404 | `{resource} not found` | Resource with given ID doesn't exist or is soft-deleted |
| `CONFLICT` | 409 | `{resource} already exists` | Generic conflict (resource already exists) |
| `DUPLICATE_ENTRY` | 409 | `{resource} with this {field} already exists` | Unique constraint violation on a specific field |
| `DUPLICATE_EMAIL` | 409 | `Email {email} is already in use` | Email uniqueness violation |

### Example — Not Found

```json
{
  "success": false,
  "messageCode": "NOT_FOUND",
  "error": "User not found",
  "statusCode": 404,
  "timestamp": "2026-02-19T10:00:00.123Z"
}
```

### Example — Duplicate Entry

```json
{
  "success": false,
  "messageCode": "DUPLICATE_EMAIL",
  "error": "Email alice@example.com is already in use",
  "statusCode": 409,
  "timestamp": "2026-02-19T10:00:00.123Z"
}
```

---

## Server Error Codes

| Code | HTTP Status | Message Template | When Used |
|------|-------------|-----------------|-----------|
| `INTERNAL_ERROR` | 500 | `An unexpected error occurred` | Unhandled exception or unknown server error |
| `SERVICE_UNAVAILABLE` | 503 | `Service is temporarily unavailable` | Service is down for maintenance or overloaded |

### Example — Internal Error

```json
{
  "success": false,
  "messageCode": "INTERNAL_ERROR",
  "error": "An unexpected error occurred",
  "statusCode": 500,
  "timestamp": "2026-02-19T10:00:00.123Z"
}
```

---

## HTTP Status Quick Reference

The `HttpStatus` enum in `@rajkumarganesan93/api` provides named constants for all HTTP status codes used in the project:

| Constant | Value | Category |
|----------|-------|----------|
| `HttpStatus.OK` | 200 | Success |
| `HttpStatus.CREATED` | 201 | Success |
| `HttpStatus.NO_CONTENT` | 204 | Success |
| `HttpStatus.BAD_REQUEST` | 400 | Client Error |
| `HttpStatus.UNAUTHORIZED` | 401 | Client Error |
| `HttpStatus.FORBIDDEN` | 403 | Client Error |
| `HttpStatus.NOT_FOUND` | 404 | Client Error |
| `HttpStatus.CONFLICT` | 409 | Client Error |
| `HttpStatus.PAYLOAD_TOO_LARGE` | 413 | Client Error |
| `HttpStatus.UNPROCESSABLE_ENTITY` | 422 | Client Error |
| `HttpStatus.INTERNAL_SERVER_ERROR` | 500 | Server Error |
| `HttpStatus.SERVICE_UNAVAILABLE` | 503 | Server Error |

---

## Message Template Placeholders

Templates use `{placeholder}` tokens that are replaced at runtime:

| Placeholder | Description | Used By |
|-------------|-------------|---------|
| `{resource}` | Entity name (e.g., "User", "Country") | CREATED, UPDATED, DELETED, FETCHED, LIST_FETCHED, NOT_FOUND, CONFLICT |
| `{reason}` | Human-readable explanation | BAD_REQUEST, VALIDATION_FAILED, INVALID_INPUT |
| `{field}` | Field name | FIELD_REQUIRED, DUPLICATE_ENTRY |
| `{email}` | Email address | DUPLICATE_EMAIL |

Unreplaced placeholders are automatically stripped from the final message.

---

## Adding New Codes

1. Add the code to `MessageCode` enum in `packages/api/src/messages/MessageCode.ts`
2. Add the entry to `MessageCatalog` in `packages/api/src/messages/MessageCatalog.ts`
3. Create a matching `AppError` subclass if needed in `packages/infrastructure/src/errors/AppError.ts`
4. Update this document
5. Bump the `@rajkumarganesan93/api` package version
