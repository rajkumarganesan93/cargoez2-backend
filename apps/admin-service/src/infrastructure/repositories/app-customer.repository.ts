import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { AppCustomerEntity } from '../../domain';

@Injectable()
export class AppCustomerRepository extends BaseRepository<AppCustomerEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'app_customers');
  }

  async findByEmail(email: string): Promise<AppCustomerEntity | null> {
    const row = await this.knex('app_customers').where('email', email).where('is_active', true).first();
    return row ? this.mapFromDb(row) : null;
  }

  async findByKeycloakSub(sub: string): Promise<AppCustomerEntity | null> {
    const row = await this.knex('app_customers').where('keycloak_sub', sub).where('is_active', true).first();
    return row ? this.mapFromDb(row) : null;
  }

  async findByTenantUid(tenantUid: string) {
    const rows = await this.knex('app_customers')
      .where('tenant_uid', tenantUid)
      .where('is_active', true)
      .orderBy('created_at', 'desc');
    return rows.map((r: any) => this.mapFromDb(r));
  }
}
