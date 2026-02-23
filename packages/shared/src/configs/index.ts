import knex, { type Knex } from 'knex';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function getDbConfig(): DbConfig {
  const host = process.env.DB_HOST ?? 'localhost';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!user) throw new Error('Missing required env var: DB_USER');
  if (!password) throw new Error('Missing required env var: DB_PASSWORD');
  if (!database) throw new Error('Missing required env var: DB_NAME');

  const port = parseInt(process.env.DB_PORT ?? '5432', 10);
  if (Number.isNaN(port)) {
    throw new Error(`Invalid DB_PORT: "${process.env.DB_PORT}" is not a number`);
  }

  return { host, port, user, password, database };
}

/**
 * Create a Knex instance from the standard DB env vars.
 * Call once at service startup and pass to repositories.
 */
export function createKnex(): Knex {
  const cfg = getDbConfig();
  return knex({
    client: 'pg',
    connection: {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
    },
    pool: { min: 2, max: 10 },
  });
}

export type { Knex };

/**
 * Read a config value from environment variables.
 * Always returns `string | undefined` -- callers must parse/convert as needed.
 */
export function getConfig(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}
