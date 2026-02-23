import { getPool } from '../db.js';
import { toEntity } from '@rajkumarganesan93/application';
import type { PaginatedResult, ListOptions } from '@rajkumarganesan93/domain';
import type {
  ICountryRepository,
  CreateCountryInput,
  UpdateCountryInput,
} from '../../domain/repositories/ICountryRepository.js';
import type { Country } from '../../domain/entities/Country.js';

const COUNTRY_COLUMNS =
  'id, code, name, is_active, created_at, modified_at, created_by, modified_by, tenant_id';

const ALLOWED_COLUMNS: Record<string, string> = {
  id: 'id',
  code: 'code',
  name: 'name',
  isActive: 'is_active',
  createdAt: 'created_at',
  modifiedAt: 'modified_at',
  createdBy: 'created_by',
  modifiedBy: 'modified_by',
  tenantId: 'tenant_id',
};

function resolveColumn(field: string): string | undefined {
  return ALLOWED_COLUMNS[field];
}

function buildWhere(
  criteria: Record<string, unknown>,
  startIndex = 1,
): { clause: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = startIndex;
  for (const [key, value] of Object.entries(criteria)) {
    const col = resolveColumn(key);
    if (!col) continue;
    conditions.push(`${col} = $${idx++}`);
    values.push(value);
  }
  const clause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
  return { clause, values };
}

export class CountryRepository implements ICountryRepository {
  async findAll(options?: ListOptions): Promise<PaginatedResult<Country>> {
    const page = options?.pagination?.page ?? 1;
    const limit = Math.min(options?.pagination?.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const countResult = await getPool().query('SELECT COUNT(*)::int AS count FROM countries WHERE is_active = true');
    const total: number = countResult.rows[0]?.count ?? 0;

    const sortCol = resolveColumn(options?.pagination?.sortBy ?? '') ?? 'created_at';
    const sortDir = options?.pagination?.sortOrder === 'desc' ? 'DESC' : 'ASC';

    const result = await getPool().query(
      `SELECT ${COUNTRY_COLUMNS} FROM countries WHERE is_active = true ORDER BY ${sortCol} ${sortDir} LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const items = result.rows.map((row) => toEntity<Country>(row as Record<string, unknown>));
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async findById(id: string): Promise<Country | null> {
    const result = await getPool().query(`SELECT ${COUNTRY_COLUMNS} FROM countries WHERE id = $1`, [id]);
    return result.rows[0] ? toEntity<Country>(result.rows[0] as Record<string, unknown>) : null;
  }

  async findOne(criteria: Record<string, unknown>): Promise<Country | null> {
    const { clause, values } = buildWhere(criteria);
    const result = await getPool().query(
      `SELECT ${COUNTRY_COLUMNS} FROM countries WHERE ${clause} LIMIT 1`,
      values,
    );
    return result.rows[0] ? toEntity<Country>(result.rows[0] as Record<string, unknown>) : null;
  }

  async findMany(
    criteria: Record<string, unknown>,
    options?: ListOptions,
  ): Promise<PaginatedResult<Country>> {
    const page = options?.pagination?.page ?? 1;
    const limit = Math.min(options?.pagination?.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { clause, values } = buildWhere(criteria);

    const countResult = await getPool().query(
      `SELECT COUNT(*)::int AS count FROM countries WHERE ${clause}`,
      values,
    );
    const total: number = countResult.rows[0]?.count ?? 0;

    const sortCol = resolveColumn(options?.pagination?.sortBy ?? '') ?? 'created_at';
    const sortDir = options?.pagination?.sortOrder === 'desc' ? 'DESC' : 'ASC';

    const dataResult = await getPool().query(
      `SELECT ${COUNTRY_COLUMNS} FROM countries WHERE ${clause} ORDER BY ${sortCol} ${sortDir} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    const items = dataResult.rows.map((row) => toEntity<Country>(row as Record<string, unknown>));
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async save(input: CreateCountryInput): Promise<Country> {
    const result = await getPool().query(
      `INSERT INTO countries (code, name) VALUES ($1, $2) RETURNING ${COUNTRY_COLUMNS}`,
      [input.code, input.name],
    );
    return toEntity<Country>(result.rows[0] as Record<string, unknown>);
  }

  async update(id: string, input: UpdateCountryInput): Promise<Country | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.code !== undefined) {
      updates.push(`code = $${idx++}`);
      values.push(input.code);
    }
    if (input.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(input.name);
    }
    if (updates.length === 0) return this.findById(id);

    updates.push('modified_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await getPool().query(
      `UPDATE countries SET ${updates.join(', ')} WHERE id = $${idx} RETURNING ${COUNTRY_COLUMNS}`,
      values,
    );
    return result.rows[0] ? toEntity<Country>(result.rows[0] as Record<string, unknown>) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await getPool().query('DELETE FROM countries WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async count(criteria?: Record<string, unknown>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      const result = await getPool().query('SELECT COUNT(*)::int AS count FROM countries');
      return result.rows[0]?.count ?? 0;
    }
    const { clause, values } = buildWhere(criteria);
    const result = await getPool().query(
      `SELECT COUNT(*)::int AS count FROM countries WHERE ${clause}`,
      values,
    );
    return result.rows[0]?.count ?? 0;
  }

  async exists(criteria: Record<string, unknown>): Promise<boolean> {
    const { clause, values } = buildWhere(criteria);
    const result = await getPool().query(
      `SELECT EXISTS(SELECT 1 FROM countries WHERE ${clause}) AS found`,
      values,
    );
    return result.rows[0]?.found ?? false;
  }
}
