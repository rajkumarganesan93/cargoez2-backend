import type { Knex } from 'knex';
import type { ColumnMap } from '@rajkumarganesan93/domain';
import { BaseRepository } from '@rajkumarganesan93/infrastructure';
import type {
  IUserRepository,
  CreateUserInput,
  UpdateUserInput,
} from '../../domain/repositories/IUserRepository.js';
import type { User } from '../../domain/entities/User.js';

const COLUMN_MAP: ColumnMap = {
  id: 'id',
  name: 'name',
  email: 'email',
  isActive: 'is_active',
  createdAt: 'created_at',
  modifiedAt: 'modified_at',
  createdBy: 'created_by',
  modifiedBy: 'modified_by',
  tenantId: 'tenant_id',
};

export class UserRepository
  extends BaseRepository<User, CreateUserInput, UpdateUserInput>
  implements IUserRepository
{
  constructor(knex: Knex) {
    super(knex, 'users', COLUMN_MAP, ['name', 'email']);
  }
}
