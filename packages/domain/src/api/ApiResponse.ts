/**
 * Common structural interface for all API responses.
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  timestamp: string;
  stack?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
