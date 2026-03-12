import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { ModuleCatalogEntity, OperationCatalogEntity } from '../../domain';

@Injectable()
export class ModuleCatalogRepository extends BaseRepository<ModuleCatalogEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'modules');
  }
}

@Injectable()
export class OperationCatalogRepository extends BaseRepository<OperationCatalogEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'operations');
  }
}
