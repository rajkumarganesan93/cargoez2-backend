import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { TenantEntity } from '../../domain';

@Injectable()
export class TenantRepository extends BaseRepository<TenantEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'tenants');
  }

  async findByCode(code: string): Promise<TenantEntity | null> {
    const row = await this.knex('tenants').where('code', code).where('is_active', true).first();
    return row ? this.mapFromDb(row) : null;
  }
}
