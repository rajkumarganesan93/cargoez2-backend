import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../../.env') });

const knexConfig = {
  client: 'pg',
  connection: {
    host: process.env['SHARED_DB_DB_HOST'] || process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['SHARED_DB_DB_PORT'] || process.env['DB_PORT'] || '5432', 10),
    user: process.env['SHARED_DB_DB_USER'] || process.env['DB_USER'] || 'postgres',
    password: process.env['SHARED_DB_DB_PASSWORD'] || process.env['DB_PASSWORD'] || 'postgres',
    database: process.env['SHARED_DB_DB_NAME'] || process.env['DB_NAME'] || 'cargoez',
  },
  migrations: {
    directory: resolve(__dirname, 'migrations'),
    extension: 'ts',
  },
};

export default knexConfig;
