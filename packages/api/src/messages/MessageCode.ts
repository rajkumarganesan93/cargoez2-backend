/**
 * Centralized message codes for all API responses.
 *
 * Developers MUST use these codes instead of writing raw strings.
 * New codes should only be added here by the core/platform team.
 */
export enum MessageCode {
  // ── Success: Generic CRUD ──────────────────────────────────
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  FETCHED = 'FETCHED',
  LIST_FETCHED = 'LIST_FETCHED',

  // ── Error: Validation / Client ─────────────────────────────
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  FIELD_REQUIRED = 'FIELD_REQUIRED',
  INVALID_INPUT = 'INVALID_INPUT',

  // ── Error: Authentication & Authorization ──────────────────
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // ── Error: Resource ────────────────────────────────────────
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',

  // ── Error: Server ──────────────────────────────────────────
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
