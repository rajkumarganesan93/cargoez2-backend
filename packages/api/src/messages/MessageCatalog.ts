import { MessageCode } from './MessageCode.js';

export interface MessageEntry {
  status: number;
  message: string;
}

/**
 * Maps every MessageCode to its default HTTP status and message template.
 *
 * Templates support `{placeholder}` tokens that are replaced at runtime
 * via `resolveMessage()`.
 */
export const MessageCatalog: Record<MessageCode, MessageEntry> = {
  // ── Success ────────────────────────────────────────────────
  [MessageCode.CREATED]: { status: 201, message: '{resource} created successfully' },
  [MessageCode.UPDATED]: { status: 200, message: '{resource} updated successfully' },
  [MessageCode.DELETED]: { status: 200, message: '{resource} deleted successfully' },
  [MessageCode.FETCHED]: { status: 200, message: '{resource} fetched successfully' },
  [MessageCode.LIST_FETCHED]: { status: 200, message: '{resource} list fetched successfully' },

  // ── Validation / Client ────────────────────────────────────
  [MessageCode.BAD_REQUEST]: { status: 400, message: 'Bad request: {reason}' },
  [MessageCode.VALIDATION_FAILED]: { status: 422, message: 'Validation failed: {reason}' },
  [MessageCode.FIELD_REQUIRED]: { status: 422, message: '{field} is required' },
  [MessageCode.INVALID_INPUT]: { status: 422, message: 'Invalid input: {reason}' },

  // ── Auth ───────────────────────────────────────────────────
  [MessageCode.UNAUTHORIZED]: { status: 401, message: 'Authentication required' },
  [MessageCode.FORBIDDEN]: { status: 403, message: 'You do not have permission to perform this action' },
  [MessageCode.INVALID_CREDENTIALS]: { status: 401, message: 'Invalid credentials' },
  [MessageCode.TOKEN_EXPIRED]: { status: 401, message: 'Token has expired' },

  // ── Resource ───────────────────────────────────────────────
  [MessageCode.NOT_FOUND]: { status: 404, message: '{resource} not found' },
  [MessageCode.CONFLICT]: { status: 409, message: '{resource} already exists' },
  [MessageCode.DUPLICATE_ENTRY]: { status: 409, message: '{resource} with this {field} already exists' },
  [MessageCode.DUPLICATE_EMAIL]: { status: 409, message: 'Email {email} is already in use' },

  // ── Server ─────────────────────────────────────────────────
  [MessageCode.INTERNAL_ERROR]: { status: 500, message: 'An unexpected error occurred' },
  [MessageCode.SERVICE_UNAVAILABLE]: { status: 503, message: 'Service is temporarily unavailable' },
};
