import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { Permission } from '../../domain/entities/permission.entity';
import { IPermissionRepository } from '../../domain/repositories/permission-repository.interface';

@Injectable()
export class PermissionRepository extends BaseRepository<Permission> implements IPermissionRepository {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'permissions');
  }

  async findByKey(permissionKey: string): Promise<Permission | null> {
    const row = await this.knex(this.table).where('permission_key', permissionKey).first();
    return row ? this.mapFromDb(row) : null;
  }

  async findByModuleId(moduleId: string): Promise<Permission[]> {
    const rows = await this.knex(this.table).where('module_id', moduleId);
    return rows.map((row: any) => this.mapFromDb(row));
  }
}
