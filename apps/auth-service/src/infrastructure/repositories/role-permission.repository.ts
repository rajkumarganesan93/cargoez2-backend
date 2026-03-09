import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { RolePermission } from '../../domain/entities/role-permission.entity';
import {
  IRolePermissionRepository,
  ResolvedPermission,
} from '../../domain/repositories/role-permission-repository.interface';

@Injectable()
export class RolePermissionRepository
  extends BaseRepository<RolePermission>
  implements IRolePermissionRepository
{
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'role_permissions');
  }

  async findByRoleId(roleId: string): Promise<RolePermission[]> {
    const rows = await this.knex(this.table).where('role_id', roleId);
    return rows.map((row: any) => this.mapFromDb(row));
  }

  async findByRoleAndPermission(roleId: string, permissionId: string): Promise<RolePermission | null> {
    const row = await this.knex(this.table).where({ role_id: roleId, permission_id: permissionId }).first();
    return row ? this.mapFromDb(row) : null;
  }

  async resolvePermissionsForRoles(roleNames: string[]): Promise<ResolvedPermission[]> {
    const rows = await this.knex('role_permissions as rp')
      .join('roles as r', 'r.id', 'rp.role_id')
      .join('permissions as p', 'p.id', 'rp.permission_id')
      .whereIn('r.name', roleNames)
      .where('r.is_active', true)
      .select('p.permission_key as key', 'rp.conditions');

    const permMap = new Map<string, Record<string, any> | null>();
    for (const row of rows) {
      const existing = permMap.get(row.key);
      if (!existing) {
        permMap.set(row.key, row.conditions ?? null);
      } else if (row.conditions === null) {
        // null conditions = unrestricted; most permissive wins
        permMap.set(row.key, null);
      }
    }

    return Array.from(permMap.entries()).map(([key, conditions]) => ({ key, conditions }));
  }
}
