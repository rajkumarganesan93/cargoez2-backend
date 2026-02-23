import { getPool } from '../db.js';
import { toEntity } from '@rajkumarganesan93/application';
import type { PaginatedResult, ListOptions } from '@rajkumarganesan93/domain';
import type {
  IUserRepository,
  CreateUserInput,
  UpdateUserInput,
} from '../../domain/repositories/IUserRepository.js';
import type { User } from '../../domain/entities/User.js';

const USER_COLUMNS =
  'id, name, email, is_active, created_at, modified_at, created_by, modified_by, tenant_id';

const ALLOWED_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  email: 'email',
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

export class UserRepository implements IUserRepository {
  async findAll(options?: ListOptions): Promise<PaginatedResult<User>> {
    const page = options?.pagination?.page ?? 1;
    const limit = Math.min(options?.pagination?.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const countResult = await getPool().query('SELECT COUNT(*)::int AS count FROM users WHERE is_active = true');
    const total: number = countResult.rows[0]?.count ?? 0;

    const sortCol = resolveColumn(options?.pagination?.sortBy ?? '') ?? 'created_at';
    const sortDir = options?.pagination?.sortOrder === 'desc' ? 'DESC' : 'ASC';

    const result = await getPool().query(
      `SELECT ${USER_COLUMNS} FROM users WHERE is_active = true ORDER BY ${sortCol} ${sortDir} LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const items = result.rows.map((row) => toEntity<User>(row as Record<string, unknown>));
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async findById(id: string): Promise<User | null> {
    const result = await getPool().query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
    return result.rows[0] ? toEntity<User>(result.rows[0] as Record<string, unknown>) : null;
  }

  async findOne(criteria: Record<string, unknown>): Promise<User | null> {
    const { clause, values } = buildWhere(criteria);
    const result = await getPool().query(
      `SELECT ${USER_COLUMNS} FROM users WHERE ${clause} LIMIT 1`,
      values,
    );
    return result.rows[0] ? toEntity<User>(result.rows[0] as Record<string, unknown>) : null;
  }

  async findMany(
    criteria: Record<string, unknown>,
    options?: ListOptions,
  ): Promise<PaginatedResult<User>> {
    const page = options?.pagination?.page ?? 1;
    const limit = Math.min(options?.pagination?.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { clause, values } = buildWhere(criteria);

    const countResult = await getPool().query(
      `SELECT COUNT(*)::int AS count FROM users WHERE ${clause}`,
      values,
    );
    const total: number = countResult.rows[0]?.count ?? 0;

    const sortCol = resolveColumn(options?.pagination?.sortBy ?? '') ?? 'created_at';
    const sortDir = options?.pagination?.sortOrder === 'desc' ? 'DESC' : 'ASC';

    const dataResult = await getPool().query(
      `SELECT ${USER_COLUMNS} FROM users WHERE ${clause} ORDER BY ${sortCol} ${sortDir} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    const items = dataResult.rows.map((row) => toEntity<User>(row as Record<string, unknown>));
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async save(input: CreateUserInput): Promise<User> {
    const result = await getPool().query(
      `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING ${USER_COLUMNS}`,
      [input.name, input.email],
    );
    return toEntity<User>(result.rows[0] as Record<string, unknown>);
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(input.name);
    }
    if (input.email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(input.email);
    }
    if (updates.length === 0) return this.findById(id);

    updates.push('modified_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await getPool().query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING ${USER_COLUMNS}`,
      values,
    );
    return result.rows[0] ? toEntity<User>(result.rows[0] as Record<string, unknown>) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await getPool().query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async count(criteria?: Record<string, unknown>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      const result = await getPool().query('SELECT COUNT(*)::int AS count FROM users');
      return result.rows[0]?.count ?? 0;
    }
    const { clause, values } = buildWhere(criteria);
    const result = await getPool().query(
      `SELECT COUNT(*)::int AS count FROM users WHERE ${clause}`,
      values,
    );
    return result.rows[0]?.count ?? 0;
  }

  async exists(criteria: Record<string, unknown>): Promise<boolean> {
    const { clause, values } = buildWhere(criteria);
    const result = await getPool().query(
      `SELECT EXISTS(SELECT 1 FROM users WHERE ${clause}) AS found`,
      values,
    );
    return result.rows[0]?.found ?? false;
  }
}
