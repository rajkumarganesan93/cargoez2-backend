import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { ProductEntity, ProductDetailEntity } from '../../domain';

@Injectable()
export class ProductRepository extends BaseRepository<ProductEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'products');
  }
}

@Injectable()
export class ProductDetailRepository extends BaseRepository<ProductDetailEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'product_details');
  }

  async findByProductUid(productUid: string) {
    const rows = await this.knex('product_details')
      .where('product_uid', productUid)
      .where('is_active', true)
      .orderBy('sort_order', 'asc');
    return rows.map((r: any) => this.mapFromDb(r));
  }
}
