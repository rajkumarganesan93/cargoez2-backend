import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  PaginatedResult,
} from '@rajkumarganesan93/domain';
import { MessageCode } from './messages/MessageCode.js';
import { resolveMessage } from './messages/resolveMessage.js';

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Build a success response payload using a MessageCode.
 *
 * @example
 *   success(user, MessageCode.CREATED, { resource: 'User' });
 *   // → { success: true, messageCode: 'CREATED', message: 'User created successfully', data: user, ... }
 *
 *   success(users);
 *   // → { success: true, data: users, ... }
 */
export function success<T>(
  data?: T,
  code?: MessageCode,
  params?: Record<string, string | number>,
): ApiSuccessResponse<T> {
  if (code) {
    const resolved = resolveMessage(code, params);
    return {
      success: true,
      messageCode: resolved.messageCode,
      message: resolved.message,
      ...(data !== undefined && { data }),
      timestamp: timestamp(),
    };
  }
  return {
    success: true,
    ...(data !== undefined && { data }),
    timestamp: timestamp(),
  };
}

/**
 * Build an error response payload using a MessageCode.
 *
 * @example
 *   error(MessageCode.NOT_FOUND, { resource: 'User' });
 *   // → { success: false, messageCode: 'NOT_FOUND', error: 'User not found', statusCode: 404, ... }
 *
 *   error(MessageCode.FIELD_REQUIRED, { field: 'name and email' });
 *   // → { success: false, messageCode: 'FIELD_REQUIRED', error: 'name and email is required', statusCode: 400, ... }
 */
export function error(
  code: MessageCode,
  params?: Record<string, string | number>,
  stack?: string,
): ApiErrorResponse {
  const resolved = resolveMessage(code, params);
  return {
    success: false,
    messageCode: resolved.messageCode,
    error: resolved.message,
    statusCode: resolved.status,
    timestamp: timestamp(),
    ...(stack && { stack }),
  };
}

/**
 * Build an error response from a raw message string (for unstructured/unexpected errors).
 * Prefer `error(MessageCode, ...)` whenever possible.
 */
export function errorRaw(
  message: string,
  statusCode: number = 500,
  stack?: string,
): ApiErrorResponse {
  return {
    success: false,
    error: message,
    statusCode,
    timestamp: timestamp(),
    ...(stack && { stack }),
  };
}

/**
 * Build a paginated success response.
 */
export function successPaginated<T>(
  items: T[],
  meta: PaginatedResult<T>['meta'],
  code?: MessageCode,
  params?: Record<string, string | number>,
): ApiSuccessResponse<PaginatedResult<T>> {
  return success({ items, meta }, code, params);
}
