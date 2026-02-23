/**
 * Pagination request for list endpoints.
 */
export interface PaginationRequest {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result wrapper.
 */
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Options for list/findAll operations.
 */
export interface ListOptions {
  pagination?: PaginationRequest;
  filters?: Record<string, unknown>;
}

/**
 * Base repository interface. All service repositories must extend this.
 * Domain-specific lookups (e.g. "find by email") use the generic
 * findOne / findMany / exists methods instead of bespoke signatures.
 */
export interface IRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findAll(options?: ListOptions): Promise<PaginatedResult<T>>;
  findOne(criteria: Record<string, unknown>): Promise<T | null>;
  findMany(criteria: Record<string, unknown>, options?: ListOptions): Promise<PaginatedResult<T>>;
  save(input: CreateInput): Promise<T>;
  update(id: string, input: UpdateInput): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(criteria?: Record<string, unknown>): Promise<number>;
  exists(criteria: Record<string, unknown>): Promise<boolean>;
}
