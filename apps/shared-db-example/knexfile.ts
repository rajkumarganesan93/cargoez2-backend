import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../../.env') });

const knexConfig = {
  client: 'pg',
  connection: {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'postgres',
    database: process.env['DB_NAME'] || 'cargoez',
  },
  migrations: {
    directory: resolve(__dirname, 'migrations'),
    extension: 'ts',
  },
};

export default knexConfig;
