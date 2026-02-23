import { Pool } from 'pg';
import { getDbConfig, createKnex } from '@rajkumarganesan93/shared';
import type { Knex } from 'knex';

let _pool: Pool | undefined;
let _knex: Knex | undefined;

export function getPool(): Pool {
  if (!_pool) {
    const config = getDbConfig();
    _pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });
  }
  return _pool;
}

export function getKnex(): Knex {
  if (!_knex) {
    _knex = createKnex();
  }
  return _knex;
}
