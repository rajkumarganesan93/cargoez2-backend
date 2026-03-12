import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { RelBranchCustomerEntity } from '../../domain';

@Injectable()
export class RelBranchCustomerRepository extends BaseRepository<RelBranchCustomerEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'rel_branch_customers');
  }

  async findByBranchCustomerUid(branchCustomerUid: string): Promise<RelBranchCustomerEntity[]> {
    const rows = await this.knex('rel_branch_customers')
      .where('branch_customer_uid', branchCustomerUid)
      .where('is_active', true);
    return rows.map((r: any) => this.mapFromDb(r));
  }

  async findByBranchUid(branchUid: string): Promise<RelBranchCustomerEntity[]> {
    const rows = await this.knex('rel_branch_customers')
      .where('branch_uid', branchUid)
      .where('is_active', true);
    return rows.map((r: any) => this.mapFromDb(r));
  }

  async deleteByBranchCustomerUid(branchCustomerUid: string): Promise<void> {
    await this.knex('rel_branch_customers')
      .where('branch_customer_uid', branchCustomerUid)
      .del();
  }
}
