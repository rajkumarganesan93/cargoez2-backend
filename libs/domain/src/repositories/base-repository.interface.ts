import { BaseEntity } from '../entities/base.entity';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string[];
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationFindAllOptions extends PaginationOptions {
  includeInactive?: boolean;
}

export interface IBaseRepository<T extends BaseEntity> {
  findAll(options?: PaginationFindAllOptions): Promise<PaginatedResult<T>>;
  findByUid(uid: string): Promise<T | null>;
  save(entity: Partial<T>): Promise<T>;
  update(uid: string, entity: Partial<T>): Promise<T>;
  delete(uid: string): Promise<void>;
}
