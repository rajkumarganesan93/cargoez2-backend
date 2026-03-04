import { Module, DynamicModule, Global } from '@nestjs/common';
import Knex from 'knex';

export const KNEX_CONNECTION = 'KNEX_CONNECTION';

export interface DatabaseModuleOptions {
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
              const dbName = opts?.database
                ?? (opts?.databaseEnvKey ? process.env[opts.databaseEnvKey] : undefined)
                ?? process.env['DB_NAME']
                ?? 'cargoez';

              knexConfig = {
                client: 'pg',
                connection: {
                  host: process.env['DB_HOST'] || 'localhost',
                  port: parseInt(process.env['DB_PORT'] || '5432', 10),
                  user: process.env['DB_USER'] || 'postgres',
                  password: process.env['DB_PASSWORD'] || 'postgres',
                  database: dbName,
                },
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
