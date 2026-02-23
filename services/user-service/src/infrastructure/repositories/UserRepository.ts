import { pool } from '../db.js';
import { toEntity } from '@cargoez2/application';
import type { ListOptions } from '@cargoez2/domain';
import type {
  IUserRepository,
  CreateUserInput,
  UpdateUserInput,
} from '../../domain/repositories/IUserRepository.js';
import type { User } from '../../domain/entities/User.js';

const USER_COLUMNS =
  'id, name, email, created_at, is_active, modified_at, created_by, modified_by, tenant_id';

export class UserRepository implements IUserRepository {
  async findAll(options?: ListOptions): Promise<{
    items: User[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = options?.pagination?.page ?? 1;
    const limit = Math.min(options?.pagination?.limit ?? 100, 500);
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int FROM users WHERE is_active = true');
    const total = countResult.rows[0]?.count ?? 0;

    const allowedSort = ['id', 'name', 'email', 'created_at', 'modified_at'];
    const sortBy = allowedSort.includes(options?.pagination?.sortBy ?? '')
      ? options!.pagination!.sortBy!
      : 'created_at';
    const sortOrder = options?.pagination?.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE is_active = true ${orderClause} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const items = result.rows.map((row) => toEntity<User>(row as Record<string, unknown>));
    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    return toEntity<User>(row as Record<string, unknown>);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE email = $1 AND is_active = true`,
      [email]
    );
    const row = result.rows[0];
    if (!row) return null;
    return toEntity<User>(row as Record<string, unknown>);
  }

  async save(input: CreateUserInput): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (name, email) VALUES ($1, $2)
       RETURNING ${USER_COLUMNS}`,
      [input.name, input.email]
    );
    return toEntity<User>(result.rows[0] as Record<string, unknown>);
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;
    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(input.email);
    }
    if (updates.length === 0) {
      return this.findById(id);
    }
    updates.push('modified_at = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING ${USER_COLUMNS}`,
      values
    );
    const row = result.rows[0];
    if (!row) return null;
    return toEntity<User>(row as Record<string, unknown>);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
