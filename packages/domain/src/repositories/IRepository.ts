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
 * Base repository interface with pagination support.
 */
export interface IRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findAll(options?: ListOptions): Promise<PaginatedResult<T>>;
  save(input: CreateInput): Promise<T>;
  update(id: string, input: UpdateInput): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}
