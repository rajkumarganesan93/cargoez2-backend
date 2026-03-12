import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { SysAdminEntity } from '../../domain';

@Injectable()
export class SysAdminRepository extends BaseRepository<SysAdminEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'sys_admins');
  }
}
