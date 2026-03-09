import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { Screen } from '../../domain/entities/screen.entity';
import { IScreenRepository } from '../../domain/repositories/screen-repository.interface';

@Injectable()
export class ScreenRepository extends BaseRepository<Screen> implements IScreenRepository {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'screens');
  }

  async findByModuleId(moduleId: string): Promise<Screen[]> {
    const rows = await this.knex(this.table).where('module_id', moduleId).orderBy('sort_order', 'asc');
    return rows.map((row: any) => this.mapFromDb(row));
  }

  async findByCode(moduleId: string, code: string): Promise<Screen | null> {
    const row = await this.knex(this.table).where({ module_id: moduleId, code }).first();
    return row ? this.mapFromDb(row) : null;
  }
}
