import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(import.meta.dirname, '../../.env') });

module.exports = {
  client: 'pg',
  connection: {
    host: process.env.SHARED_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.SHARED_DB_PORT || process.env.DB_PORT || '5432', 10),
    user: process.env.SHARED_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.SHARED_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    database: process.env.SHARED_DB_NAME || 'shared_db',
  },
  migrations: {
    directory: join(import.meta.dirname, 'migrations/tenant'),
    extension: 'ts',
  },
  seeds: {
    directory: join(import.meta.dirname, 'seeds/tenant'),
    extension: 'ts',
  },
};
