import { Module, DynamicModule, Global } from '@nestjs/common';
import Knex from 'knex';

export const KNEX_CONNECTION = 'KNEX_CONNECTION';

export interface DatabaseModuleOptions {
  connectionPrefix?: string;
  databaseEnvKey?: string;
  database?: string;
}

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(options?: DatabaseModuleOptions | Knex.Knex.Config): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: KNEX_CONNECTION,
          useFactory: () => {
            let knexConfig: Knex.Knex.Config;

            if (options && 'client' in options) {
              knexConfig = options as Knex.Knex.Config;
            } else {
              const opts = options as DatabaseModuleOptions | undefined;
              const p = opts?.connectionPrefix;
              const env = (key: string) => process.env[key];

              const host     = (p && env(`${p}_DB_HOST`))     ?? env('DB_HOST')     ?? 'localhost';
              const port     = (p && env(`${p}_DB_PORT`))      ?? env('DB_PORT')     ?? '5432';
              const user     = (p && env(`${p}_DB_USER`))      ?? env('DB_USER')     ?? 'postgres';
              const password = (p && env(`${p}_DB_PASSWORD`))   ?? env('DB_PASSWORD') ?? 'postgres';
              const database = opts?.database
                ?? (p && env(`${p}_DB_NAME`))
                ?? (opts?.databaseEnvKey ? env(opts.databaseEnvKey) : undefined)
                ?? env('DB_NAME')
                ?? 'cargoez';

              knexConfig = {
                client: 'pg',
                connection: { host, port: parseInt(port, 10), user, password, database },
                pool: { min: 2, max: 10 },
              };
            }

            return Knex(knexConfig);
          },
        },
      ],
      exports: [KNEX_CONNECTION],
    };
  }
}
