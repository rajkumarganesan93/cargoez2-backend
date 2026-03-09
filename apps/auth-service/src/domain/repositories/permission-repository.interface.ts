import { IBaseRepository } from '@cargoez/domain';
import { Permission } from '../entities/permission.entity';

export const PERMISSION_REPOSITORY = 'PERMISSION_REPOSITORY';

export interface IPermissionRepository extends IBaseRepository<Permission> {
  findByKey(permissionKey: string): Promise<Permission | null>;
  findByModuleId(moduleId: string): Promise<Permission[]>;
}
