/**
 * Common structural interfaces for all API responses.
 *
 * Every response includes an optional `messageCode` field so frontends
 * can switch on a stable enum value rather than parsing human-readable text.
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  messageCode?: string;
  message?: string;
  data?: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  messageCode?: string;
  error: string;
  statusCode: number;
  timestamp: string;
  stack?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
