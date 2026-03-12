import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import {
  AdminRoleEntity,
  AdminPermissionEntity,
  AdminRolePermissionEntity,
  SysAdminRoleEntity,
} from '../../domain';

@Injectable()
export class AdminRoleRepository extends BaseRepository<AdminRoleEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'admin_roles');
  }
}

@Injectable()
export class AdminPermissionRepository extends BaseRepository<AdminPermissionEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'admin_permissions');
  }
}

@Injectable()
export class AdminRolePermissionRepository extends BaseRepository<AdminRolePermissionEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'admin_role_permissions');
  }

  async findByRoleUid(roleUid: string): Promise<AdminRolePermissionEntity[]> {
    const rows = await this.knex('admin_role_permissions')
      .where('admin_role_uid', roleUid)
      .where('is_active', true);
    return rows.map((r: any) => this.mapFromDb(r));
  }
}

@Injectable()
export class SysAdminRoleRepository extends BaseRepository<SysAdminRoleEntity> {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex, 'sys_admin_roles');
  }

  async findBySysAdminUid(sysAdminUid: string): Promise<SysAdminRoleEntity[]> {
    const rows = await this.knex('sys_admin_roles')
      .where('sys_admin_uid', sysAdminUid)
      .where('is_active', true);
    return rows.map((r: any) => this.mapFromDb(r));
  }
}
