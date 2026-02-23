import type {
  ApiSuccessResponse,
  ApiErrorResponse,
} from '@cargoez2/domain';
import type { PaginatedResult } from '@cargoez2/domain';

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Build a success response payload.
 */
export function success<T>(data?: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
    timestamp: timestamp(),
  };
}

/**
 * Build an error response payload.
 */
export function error(
  message: string,
  statusCode: number = 500,
  stack?: string
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
  meta: PaginatedResult<T>['meta']
): ApiSuccessResponse<PaginatedResult<T>> {
  return success({ items, meta });
}
