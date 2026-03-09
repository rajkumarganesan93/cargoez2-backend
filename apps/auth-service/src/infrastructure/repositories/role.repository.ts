import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { Role } from '../../domain/entities/role.entity';
import { IRoleRepository } from '../../domain/repositories/role-repository.interface';

@Injectable()
export class RoleRepository extends BaseRepository<Role> implements IRoleRepository {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'roles');
  }

  async findByName(name: string): Promise<Role | null> {
    const row = await this.knex(this.table).where('name', name).first();
    return row ? this.mapFromDb(row) : null;
  }

  async findByNames(names: string[]): Promise<Role[]> {
    const rows = await this.knex(this.table).whereIn('name', names);
    return rows.map((row: any) => this.mapFromDb(row));
  }
}
