import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { MetaDataEntity, MetaDataDetailEntity } from '../../domain';

@Injectable()
export class MetaDataRepository extends BaseRepository<MetaDataEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'meta_data');
  }
}

@Injectable()
export class MetaDataDetailRepository extends BaseRepository<MetaDataDetailEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'meta_data_details');
  }

  async findByMetaDataUid(metaDataUid: string) {
    const rows = await this.knex('meta_data_details')
      .where('meta_data_uid', metaDataUid)
      .where('is_active', true)
      .orderBy('sort_order', 'asc');
    return rows.map((r: any) => this.mapFromDb(r));
  }
}
