const { config } = require('dotenv');
const { join } = require('path');

config({ path: join(__dirname, '../../.env') });

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
    directory: join(__dirname, 'migrations/admin'),
    extension: 'ts',
  },
  seeds: {
    directory: join(__dirname, 'seeds/admin'),
    extension: 'ts',
  },
};
