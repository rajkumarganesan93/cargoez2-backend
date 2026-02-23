import { Pool } from 'pg';
import { getDbConfig } from '@rajkumarganesan93/shared';

let _pool: Pool | undefined;

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
