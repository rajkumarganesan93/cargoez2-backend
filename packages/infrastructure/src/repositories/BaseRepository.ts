import type { Knex } from 'knex';
import type {
  ColumnMap,
  IRepository,
  PaginatedResult,
  ListOptions,
} from '@rajkumarganesan93/domain';
import { toEntity } from '@rajkumarganesan93/application';

/**
 * Generic repository that implements all 9 IRepository methods using Knex.
 *
 * Subclass usage:
 * ```
 * export class UserRepository extends BaseRepository<User, CreateUserInput, UpdateUserInput> {
 *   constructor(knex: Knex) {
 *     super(knex, 'users', USER_COLUMN_MAP, ['name', 'email']);
 *   }
 * }
 * ```
 *
 * For complex queries (JOINs, transactions), access `this.knex` directly.
 */
export class BaseRepository<
  T,
  CreateInput extends object,
  UpdateInput extends object,
> implements IRepository<T, CreateInput, UpdateInput>
{
  protected readonly knex: Knex;
  private readonly table: string;
  private readonly columnMap: ColumnMap;
  private readonly writableFields: string[];

  constructor(
    knex: Knex,
    table: string,
    columnMap: ColumnMap,
    writableFields: string[],
  ) {
    this.knex = knex;
    this.table = table;
    this.columnMap = columnMap;
    this.writableFields = writableFields;
  }

  /** Resolve entity property name to DB column name via the ColumnMap. */
  protected col(prop: string): string {
    return this.columnMap[prop] ?? prop;
  }

  /**
   * Map entity-keyed criteria to DB-column-keyed criteria.
   * Keys not present in the ColumnMap are silently ignored (security).
   */
  private mapCriteria(criteria: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(criteria)) {
      if (value === undefined) continue;
      const colName = this.columnMap[key];
      if (colName) mapped[colName] = value;
    }
    return mapped;
  }

  /**
   * Map a create/update input object to DB columns.
   * Only fields listed in `writableFields` are included.
   */
  private mapInput(input: object): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue;
      if (this.writableFields.includes(key)) {
        mapped[this.col(key)] = value;
      }
    }
    return mapped;
  }

  private rowToEntity(row: Record<string, unknown>): T {
    return toEntity<T>(row, this.columnMap);
  }

  /**
   * Resolve sortBy to a safe column name. Falls back to created_at
   * if the property is not in the ColumnMap.
   */
  private safeSortCol(sortBy?: string): string {
    if (!sortBy) return this.col('createdAt');
    return this.columnMap[sortBy] ? this.columnMap[sortBy] : this.col('createdAt');
  }

  async findById(id: string): Promise<T | null> {
    const row = await this.knex(this.table).where('id', id).first();
    return row ? this.rowToEntity(row) : null;
  }

  async findAll(options?: ListOptions): Promise<PaginatedResult<T>> {
    const page = options?.pagination?.page ?? 1;
    const limit = Math.min(options?.pagination?.limit ?? 20, 100);
    const offset = (page - 1) * limit;
    const sortCol = this.safeSortCol(options?.pagination?.sortBy);
    const sortDir = options?.pagination?.sortOrder ?? 'asc';

    const [{ count }] = await this.knex(this.table)
      .where(this.col('isActive'), true)
      .count('* as count');
    const total = Number(count);

    const rows = await this.knex(this.table)
      .where(this.col('isActive'), true)
      .orderBy(sortCol, sortDir)
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((r: Record<string, unknown>) => this.rowToEntity(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(criteria: Record<string, unknown>): Promise<T | null> {
    const row = await this.knex(this.table).where(this.mapCriteria(criteria)).first();
    return row ? this.rowToEntity(row) : null;
  }

  async findMany(
    criteria: Record<string, unknown>,
    options?: ListOptions,
  ): Promise<PaginatedResult<T>> {
    const page = options?.pagination?.page ?? 1;
    const limit = Math.min(options?.pagination?.limit ?? 20, 100);
    const offset = (page - 1) * limit;
    const sortCol = this.safeSortCol(options?.pagination?.sortBy);
    const sortDir = options?.pagination?.sortOrder ?? 'asc';
    const mapped = this.mapCriteria(criteria);

    const [{ count }] = await this.knex(this.table)
      .where(mapped)
      .count('* as count');
    const total = Number(count);

    const rows = await this.knex(this.table)
      .where(mapped)
      .orderBy(sortCol, sortDir)
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((r: Record<string, unknown>) => this.rowToEntity(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async save(input: CreateInput): Promise<T> {
    const mapped = this.mapInput(input);
    const [row] = await this.knex(this.table).insert(mapped).returning('*');
    return this.rowToEntity(row);
  }

  async update(id: string, input: UpdateInput): Promise<T | null> {
    const mapped = this.mapInput(input);
    if (Object.keys(mapped).length === 0) return this.findById(id);
    mapped[this.col('modifiedAt')] = this.knex.fn.now();

    const rows = await this.knex(this.table)
      .where('id', id)
      .update(mapped)
      .returning('*');
    return rows[0] ? this.rowToEntity(rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.knex(this.table).where('id', id).del();
    return count > 0;
  }

  async count(criteria?: Record<string, unknown>): Promise<number> {
    const q = this.knex(this.table);
    if (criteria && Object.keys(criteria).length > 0) {
      q.where(this.mapCriteria(criteria));
    }
    const [{ count }] = await q.count('* as count');
    return Number(count);
  }

  async exists(criteria: Record<string, unknown>): Promise<boolean> {
    const row = await this.knex(this.table)
      .where(this.mapCriteria(criteria))
      .select(this.knex.raw('1'))
      .first();
    return !!row;
  }
}
