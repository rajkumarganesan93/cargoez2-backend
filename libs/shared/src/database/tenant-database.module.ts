import { Module, DynamicModule, Global, Scope } from '@nestjs/common';
import Knex from 'knex';
import { getContextOrNull, TenantDbConnection } from '@cargoez/domain';

export const TENANT_KNEX_CONNECTION = 'TENANT_KNEX_CONNECTION';

export class TenantConnectionManager {
  private pools: Map<string, { knex: Knex.Knex; lastUsed: number }> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs = 30 * 60 * 1000) {
    this.ttlMs = ttlMs;
    setInterval(() => this.evictStale(), 60_000);
  }

  getConnection(tenantUid: string, dbConnection: TenantDbConnection): Knex.Knex {
    const existing = this.pools.get(tenantUid);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.knex;
    }

    const knex = Knex({
      client: 'pg',
      connection: {
        host: dbConnection.host,
        port: dbConnection.port,
        user: dbConnection.user,
        password: dbConnection.password,
        database: dbConnection.name,
      },
      pool: { min: 1, max: 5 },
    });

    this.pools.set(tenantUid, { knex, lastUsed: Date.now() });
    return knex;
  }

  private evictStale(): void {
    const now = Date.now();
    for (const [key, entry] of this.pools.entries()) {
      if (now - entry.lastUsed > this.ttlMs) {
        entry.knex.destroy().catch(() => {});
        this.pools.delete(key);
      }
    }
  }

  async destroyAll(): Promise<void> {
    for (const [, entry] of this.pools.entries()) {
      await entry.knex.destroy().catch(() => {});
    }
    this.pools.clear();
  }
}

const tenantConnectionManager = new TenantConnectionManager();

@Global()
@Module({})
export class TenantDatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: TenantDatabaseModule,
      providers: [
        {
          provide: 'TENANT_CONNECTION_MANAGER',
          useValue: tenantConnectionManager,
        },
        {
          provide: TENANT_KNEX_CONNECTION,
          scope: Scope.REQUEST,
          useFactory: () => {
            const ctx = getContextOrNull();
            if (!ctx?.tenantUid || !ctx?.dbConnection) {
              return null;
            }
            return tenantConnectionManager.getConnection(ctx.tenantUid, ctx.dbConnection);
          },
        },
      ],
      exports: [TENANT_KNEX_CONNECTION, 'TENANT_CONNECTION_MANAGER'],
    };
  }
}
