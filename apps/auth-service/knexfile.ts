import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve(process.cwd(), '../../.env') });

const knexConfig = {
  client: 'pg',
  connection: {
    host: process.env['AUTH_SERVICE_DB_HOST'] || process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['AUTH_SERVICE_DB_PORT'] || process.env['DB_PORT'] || '5432', 10),
    user: process.env['AUTH_SERVICE_DB_USER'] || process.env['DB_USER'] || 'postgres',
    password: process.env['AUTH_SERVICE_DB_PASSWORD'] || process.env['DB_PASSWORD'] || 'postgres',
    database: process.env['AUTH_SERVICE_DB_NAME'] || process.env['DB_NAME'] || 'auth_db',
  },
  migrations: {
    directory: resolve(process.cwd(), 'migrations'),
    extension: 'ts',
  },
};

export default knexConfig;
