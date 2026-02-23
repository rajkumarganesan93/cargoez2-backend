import type { PaginationRequest } from '../repositories/IRepository.js';

/**
 * Common request envelope for list/search endpoints.
 */
export interface RequestEnvelope<T = unknown> {
  tenantId?: string;
  requestId?: string;
  pagination?: PaginationRequest;
  filters?: Record<string, unknown>;
  body?: T;
}
