import knex, { type Knex } from 'knex';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function getDbConfig(): DbConfig {
  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? '',
  };
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
  });
}

export type { Knex };

export function getConfig<T = string>(key: string, defaultValue?: T): T | string | undefined {
  const value = process.env[key];
  if (value === undefined) return defaultValue as T | undefined;
  return value as T | string;
}
