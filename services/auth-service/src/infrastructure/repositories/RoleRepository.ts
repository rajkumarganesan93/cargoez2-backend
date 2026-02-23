import { pool } from '../db.js';
import { toEntity } from '@rajkumarganesan93/application';
import type { IRoleRepository } from '../../domain/repositories/IRoleRepository.js';
import type { Role } from '../../domain/entities/Role.js';

const ROLE_COLUMNS =
  'id, name, created_at, is_active, modified_at, created_by, modified_by, tenant_id';

export class RoleRepository implements IRoleRepository {
  async findById(id: string): Promise<Role | null> {
    const result = await pool.query(
      `SELECT ${ROLE_COLUMNS} FROM roles WHERE id = $1 AND is_active = true`,
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    return toEntity<Role>(row as Record<string, unknown>);
  }

  async findByName(name: string): Promise<Role | null> {
    const result = await pool.query(
      `SELECT ${ROLE_COLUMNS} FROM roles WHERE name = $1 AND is_active = true`,
      [name]
    );
    const row = result.rows[0];
    if (!row) return null;
    return toEntity<Role>(row as Record<string, unknown>);
  }
}
