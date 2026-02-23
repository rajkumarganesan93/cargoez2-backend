import type { Request, Response, NextFunction } from 'express';
import type { PaginationRequest } from '@rajkumarganesan93/domain';

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export function asyncHandler(
  fn: AsyncRequestHandler
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next) as Promise<void>;
  };
}

export function healthCheck(): { status: string; timestamp: string } {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

export interface PaginationConfig {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  allowedSortFields?: string[];
}

/**
 * Parse pagination, sorting, and limit parameters from an Express query object.
 * Returns a validated PaginationRequest safe for use in repositories.
 */
export function parsePaginationFromQuery(
  query: Record<string, unknown>,
  config?: PaginationConfig,
): PaginationRequest {
  const defaultPage = config?.defaultPage ?? 1;
  const defaultLimit = config?.defaultLimit ?? 20;
  const maxLimit = config?.maxLimit ?? 100;
  const defaultSortBy = config?.defaultSortBy ?? 'createdAt';
  const defaultSortOrder = config?.defaultSortOrder ?? 'asc';
  const allowed = config?.allowedSortFields;

  const page = Math.max(1, parseInt(String(query.page ?? ''), 10) || defaultPage);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(query.limit ?? ''), 10) || defaultLimit));

  let sortBy = defaultSortBy;
  if (typeof query.sortBy === 'string' && query.sortBy.length > 0) {
    sortBy = allowed?.length ? (allowed.includes(query.sortBy) ? query.sortBy : defaultSortBy) : query.sortBy;
  }

  const sortOrder: 'asc' | 'desc' = query.sortOrder === 'desc' ? 'desc' : defaultSortOrder;

  return { page, limit, sortBy, sortOrder };
}
