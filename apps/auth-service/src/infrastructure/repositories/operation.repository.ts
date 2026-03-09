import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { Operation } from '../../domain/entities/operation.entity';
import { IOperationRepository } from '../../domain/repositories/operation-repository.interface';

@Injectable()
export class OperationRepository extends BaseRepository<Operation> implements IOperationRepository {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'operations');
  }

  async findByCode(code: string): Promise<Operation | null> {
    const row = await this.knex(this.table).where('code', code).first();
    return row ? this.mapFromDb(row) : null;
  }
}
