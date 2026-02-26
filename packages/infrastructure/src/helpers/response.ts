import type { Response } from 'express';
import type { PaginatedResult } from '@rajkumarganesan93/domain';
import {
  success,
  error,
  successPaginated,
  MessageCode,
  MessageCatalog,
} from '@rajkumarganesan93/api';

/**
 * Send a success response. HTTP status is auto-resolved from the MessageCode
 * so callers never hardcode status numbers.
 *
 *   return sendSuccess(res, user, MessageCode.CREATED, { resource: 'User' });
 *   // → 201: { success: true, messageCode: "CREATED", data: user, ... }
 */
export function sendSuccess<T>(
  res: Response,
  data?: T,
  code?: MessageCode,
  params?: Record<string, string | number>,
): Response {
  const status = code ? MessageCatalog[code].status : 200;
  return res.status(status).json(success(data, code, params));
}

/**
 * Send an error response. HTTP status is auto-resolved from the MessageCode.
 *
 *   return sendError(res, MessageCode.FIELD_REQUIRED, { field: 'email' });
 *   // → 400: { success: false, messageCode: "FIELD_REQUIRED", error: "email is required", ... }
 */
export function sendError(
  res: Response,
  code: MessageCode,
  params?: Record<string, string | number>,
): Response {
  const status = MessageCatalog[code].status;
  return res.status(status).json(error(code, params));
}

/**
 * Send a paginated success response. HTTP status is auto-resolved from the MessageCode.
 *
 *   return sendPaginated(res, result.items, result.meta, MessageCode.LIST_FETCHED, { resource: 'User' });
 */
export function sendPaginated<T>(
  res: Response,
  items: T[],
  meta: PaginatedResult<T>['meta'],
  code?: MessageCode,
  params?: Record<string, string | number>,
): Response {
  const status = code ? MessageCatalog[code].status : 200;
  return res.status(status).json(successPaginated(items, meta, code, params));
}
