import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { BranchCustomerEntity } from '../../domain';

@Injectable()
export class BranchCustomerRepository extends BaseRepository<BranchCustomerEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'branch_customers');
  }
}
