import { Pool } from 'pg';
import { getDbConfig } from '@rajkumarganesan93/shared';

const config = getDbConfig();
export const pool = new Pool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
});
