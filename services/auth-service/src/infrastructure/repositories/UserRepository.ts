import { pool } from '../db.js';
import { toEntity } from '@cargoez2/application';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { User } from '../../domain/entities/User.js';

const AUTH_USER_COLUMNS =
  'id, email, password_hash, role_id, created_at, is_active, modified_at, created_by, modified_by, tenant_id';

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT ${AUTH_USER_COLUMNS} FROM auth_users WHERE id = $1 AND is_active = true`,
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    return toEntity<User>(row as Record<string, unknown>);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT ${AUTH_USER_COLUMNS} FROM auth_users WHERE email = $1 AND is_active = true`,
      [email]
    );
    const row = result.rows[0];
    if (!row) return null;
    return toEntity<User>(row as Record<string, unknown>);
  }

  async save(input: { email: string; passwordHash: string; roleId: string }): Promise<User> {
    const result = await pool.query(
      `INSERT INTO auth_users (email, password_hash, role_id) VALUES ($1, $2, $3)
       RETURNING ${AUTH_USER_COLUMNS}`,
      [input.email, input.passwordHash, input.roleId]
    );
    return toEntity<User>(result.rows[0] as Record<string, unknown>);
  }
}
