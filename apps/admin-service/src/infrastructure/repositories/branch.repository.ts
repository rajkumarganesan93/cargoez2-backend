import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { BranchEntity } from '../../domain';

@Injectable()
export class BranchRepository extends BaseRepository<BranchEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'branches');
  }

  async findByTenantUid(tenantUid: string): Promise<BranchEntity[]> {
    const rows = await this.knex('branches')
      .where('tenant_uid', tenantUid)
      .where('is_active', true)
      .orderBy('created_at', 'desc');
    return rows.map((r: any) => this.mapFromDb(r));
  }
}
