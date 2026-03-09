import { IBaseRepository } from '@cargoez/domain';
import { Role } from '../entities/role.entity';

export const ROLE_REPOSITORY = 'ROLE_REPOSITORY';

export interface IRoleRepository extends IBaseRepository<Role> {
  findByName(name: string): Promise<Role | null>;
  findByNames(names: string[]): Promise<Role[]>;
}
