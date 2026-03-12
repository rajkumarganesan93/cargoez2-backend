import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { AppCustomerCredentialEntity } from '../../domain';

@Injectable()
export class AppCustomerCredentialRepository extends BaseRepository<AppCustomerCredentialEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'app_customer_credentials');
  }

  async findByCustomerUid(appCustomerUid: string): Promise<AppCustomerCredentialEntity[]> {
    const rows = await this.knex('app_customer_credentials')
      .where('app_customer_uid', appCustomerUid)
      .where('is_active', true);
    return rows.map((r: any) => this.mapFromDb(r));
  }
}
