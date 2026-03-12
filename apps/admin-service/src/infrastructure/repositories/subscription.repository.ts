import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { SubscriptionEntity } from '../../domain';

@Injectable()
export class SubscriptionRepository extends BaseRepository<SubscriptionEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'subscriptions');
  }

  async findByProductUid(productUid: string) {
    const rows = await this.knex('subscriptions')
      .where('product_uid', productUid)
      .where('is_active', true)
      .orderBy('created_at', 'desc');
    return rows.map((r: any) => this.mapFromDb(r));
  }
}
