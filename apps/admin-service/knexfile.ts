import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(import.meta.dirname, '../../.env') });

module.exports = {
  client: 'pg',
  connection: {
    host: process.env.ADMIN_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.ADMIN_DB_PORT || process.env.DB_PORT || '5432', 10),
    user: process.env.ADMIN_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.ADMIN_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    database: process.env.ADMIN_DB_NAME || 'admin_db',
  },
  migrations: {
    directory: join(import.meta.dirname, 'migrations/admin'),
    extension: 'ts',
  },
  seeds: {
    directory: join(import.meta.dirname, 'seeds/admin'),
    extension: 'ts',
  },
};
