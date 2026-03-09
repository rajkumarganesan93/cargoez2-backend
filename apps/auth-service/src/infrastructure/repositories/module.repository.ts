import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { AppModule } from '../../domain/entities/module.entity';
import { IModuleRepository } from '../../domain/repositories/module-repository.interface';

@Injectable()
export class ModuleRepository extends BaseRepository<AppModule> implements IModuleRepository {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'modules');
  }

  async findByCode(code: string): Promise<AppModule | null> {
    const row = await this.knex(this.table).where('code', code).first();
    return row ? this.mapFromDb(row) : null;
  }
}
