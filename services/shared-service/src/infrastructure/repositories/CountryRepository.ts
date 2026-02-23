import { pool } from '../db.js';
import type { ICountryRepository } from '../../domain/repositories/ICountryRepository.js';
import type { Country } from '../../domain/entities/Country.js';

export class CountryRepository implements ICountryRepository {
  async findById(id: string): Promise<Country | null> {
    const result = await pool.query(
      'SELECT id, code, name, created_at FROM countries WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.toEntity(row);
  }

  async findByCode(code: string): Promise<Country | null> {
    const result = await pool.query(
      'SELECT id, code, name, created_at FROM countries WHERE code = $1',
      [code.toUpperCase()]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.toEntity(row);
  }

  async findAll(): Promise<Country[]> {
    const result = await pool.query(
      'SELECT id, code, name, created_at FROM countries ORDER BY name'
    );
    return result.rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: { id: string; code: string; name: string; created_at: Date }): Country {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      createdAt: row.created_at,
    };
  }
}
