import dotenv from 'dotenv';

dotenv.config();

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

export function getConfig<T = string>(key: string, defaultValue?: T): T | string | undefined {
  const value = process.env[key];
  if (value === undefined) return defaultValue as T | undefined;
  return value as T | string;
}
