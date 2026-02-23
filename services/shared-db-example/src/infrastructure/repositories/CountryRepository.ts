import type { Knex } from 'knex';
import type { ColumnMap } from '@rajkumarganesan93/domain';
import { BaseRepository } from '@rajkumarganesan93/infrastructure';
import type {
  ICountryRepository,
  CreateCountryInput,
  UpdateCountryInput,
} from '../../domain/repositories/ICountryRepository.js';
import type { Country } from '../../domain/entities/Country.js';

const COLUMN_MAP: ColumnMap = {
  id: 'id',
  code: 'code',
  name: 'name',
  isActive: 'is_active',
  createdAt: 'created_at',
  modifiedAt: 'modified_at',
  createdBy: 'created_by',
  modifiedBy: 'modified_by',
  tenantId: 'tenant_id',
};

export class CountryRepository
  extends BaseRepository<Country, CreateCountryInput, UpdateCountryInput>
  implements ICountryRepository
{
  constructor(knex: Knex) {
    super(knex, 'countries', COLUMN_MAP, ['code', 'name']);
  }
}
