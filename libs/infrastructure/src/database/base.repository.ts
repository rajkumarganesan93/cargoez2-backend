import { Knex } from 'knex';
import { BaseEntity, IBaseRepository, PaginationFindAllOptions, PaginatedResult } from '@cargoez/domain';
import { getCurrentUserIdOrNull, getCurrentTenantUidOrNull, getContextOrNull } from '../context/request-context';
import { domainEventBus } from '../events/domain-event-bus';

export abstract class BaseRepository<T extends BaseEntity> implements IBaseRepository<T> {
  constructor(
    protected readonly knex: Knex,
    protected readonly table: string,
    protected readonly columnMap: Record<string, string> = {},
  ) {}

  protected mapToDb(entity: Record<string, any>, isCreate = false): Record<string, any> {
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(entity)) {
      if (key === 'uid' && !isCreate) continue;
      const dbCol = this.columnMap[key] || this.camelToSnake(key);
      mapped[dbCol] = value;
    }
    const userId = getCurrentUserIdOrNull() ?? 'anonymous';
    const tenantUid = getCurrentTenantUidOrNull();
    if (isCreate) {
      mapped['created_by'] = userId;
      mapped['modified_by'] = userId;
      if (tenantUid) mapped['tenant_uid'] = tenantUid;
      if (mapped['is_active'] === undefined) mapped['is_active'] = true;
    } else {
      mapped['modified_by'] = userId;
    }
    return mapped;
  }

  protected mapFromDb(row: Record<string, any>): T {
    const entity: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = this.snakeToCamel(key);
      entity[camelKey] = value;
    }
    return entity as T;
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  protected getAbacFilters(): Record<string, any> | undefined {
    const ctx = getContextOrNull();
    return ctx?.abacFilters;
  }

  protected applyAbacFilters(query: Knex.QueryBuilder): Knex.QueryBuilder {
    const filters = this.getAbacFilters();
    if (!filters) return query;
    for (const [col, val] of Object.entries(filters)) {
      query = query.where(col, val);
    }
    return query;
  }

  async findAll(options: PaginationFindAllOptions = {}): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc', search, searchFields, includeInactive = false } = options;
    const offset = (page - 1) * limit;
    const dbSortBy = this.columnMap[sortBy] || this.camelToSnake(sortBy);

    let query = this.knex(this.table);
    let countQuery = this.knex(this.table).count('* as total');

    if (!includeInactive) {
      query = query.where(`${this.table}.is_active`, true);
      countQuery = countQuery.where(`${this.table}.is_active`, true);
    }

    query = this.applyAbacFilters(query);
    countQuery = this.applyAbacFilters(countQuery);

    if (search && searchFields && searchFields.length > 0) {
      const searchFilter = (builder: Knex.QueryBuilder) => {
        searchFields.forEach((field, i) => {
          const dbField = this.columnMap[field] || this.camelToSnake(field);
          if (i === 0) builder.whereILike(dbField, `%${search}%`);
          else builder.orWhereILike(dbField, `%${search}%`);
        });
      };
      query = query.where(searchFilter);
      countQuery = countQuery.where(searchFilter);
    }

    const [rows, [{ total }]] = await Promise.all([
      query.orderBy(dbSortBy, sortOrder).limit(limit).offset(offset),
      countQuery,
    ]);

    return {
      data: rows.map((row: any) => this.mapFromDb(row)),
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  async findByUid(uid: string): Promise<T | null> {
    const row = await this.knex(this.table).where('uid', uid).first();
    return row ? this.mapFromDb(row) : null;
  }

  async save(entity: Partial<T>): Promise<T> {
    const mapped = this.mapToDb(entity as Record<string, any>, true);
    const [row] = await this.knex(this.table).insert(mapped).returning('*');
    const result = this.mapFromDb(row);
    this.emitEvent('created', result);
    return result;
  }

  async update(uid: string, entity: Partial<T>): Promise<T> {
    const mapped = this.mapToDb(entity as Record<string, any>, false);
    let query = this.knex(this.table).where('uid', uid);
    query = this.applyAbacFilters(query);
    const [row] = await query.update(mapped).returning('*');
    if (!row) throw new Error(`Entity not found: ${uid}`);
    const result = this.mapFromDb(row);
    this.emitEvent('updated', result);
    return result;
  }

  async delete(uid: string): Promise<void> {
    let query = this.knex(this.table).where('uid', uid);
    query = this.applyAbacFilters(query);
    const deleted = await query.del();
    if (!deleted) throw new Error(`Entity not found: ${uid}`);
    this.emitEvent('deleted', { uid } as unknown as T);
  }

  private emitEvent(action: string, data: T): void {
    domainEventBus.emit({
      entity: this.table,
      action,
      entityId: (data as any).uid || '',
      data,
      actor: getCurrentUserIdOrNull() ?? 'anonymous',
      tenantId: getCurrentTenantUidOrNull() ?? undefined,
      timestamp: new Date(),
    });
  }
}
