import { pool } from '../db.js';
import { toEntity } from '@rajkumarganesan93/application';
import type { ITokenRepository } from '../../domain/repositories/ITokenRepository.js';
import type { Token } from '../../domain/entities/Token.js';

const TOKEN_COLUMNS =
  'id, user_id, value, expires_at, created_at, is_active, modified_at, created_by, modified_by, tenant_id';

export class TokenRepository implements ITokenRepository {
  async findByValue(value: string): Promise<Token | null> {
    const result = await pool.query(
      `SELECT ${TOKEN_COLUMNS} FROM tokens WHERE value = $1 AND is_active = true`,
      [value]
    );
    const row = result.rows[0];
    if (!row) return null;
    return toEntity<Token>(row as Record<string, unknown>);
  }

  async save(input: { userId: string; value: string; expiresAt: Date }): Promise<Token> {
    const result = await pool.query(
      `INSERT INTO tokens (user_id, value, expires_at) VALUES ($1, $2, $3)
       RETURNING ${TOKEN_COLUMNS}`,
      [input.userId, input.value, input.expiresAt]
    );
    return toEntity<Token>(result.rows[0] as Record<string, unknown>);
  }

  async deleteByValue(value: string): Promise<void> {
    await pool.query('DELETE FROM tokens WHERE value = $1', [value]);
  }
}
