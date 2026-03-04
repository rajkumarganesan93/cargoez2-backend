import { Module, DynamicModule, Global } from '@nestjs/common';
import Knex from 'knex';

export const KNEX_CONNECTION = 'KNEX_CONNECTION';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(config?: Knex.Knex.Config): DynamicModule {
    const knexConfig: Knex.Knex.Config = config ?? {
      client: 'pg',
      connection: {
        host: process.env['DB_HOST'] || 'localhost',
        port: parseInt(process.env['DB_PORT'] || '5432', 10),
        user: process.env['DB_USER'] || 'postgres',
        password: process.env['DB_PASSWORD'] || 'postgres',
        database: process.env['DB_NAME'] || 'cargoez',
      },
      pool: { min: 2, max: 10 },
    };

    return {
      module: DatabaseModule,
      providers: [
        {
          provide: KNEX_CONNECTION,
          useFactory: () => Knex(knexConfig),
        },
      ],
      exports: [KNEX_CONNECTION],
    };
  }
}
