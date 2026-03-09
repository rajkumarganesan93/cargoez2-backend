import { IBaseRepository } from '@cargoez/domain';
import { RolePermission } from '../entities/role-permission.entity';

export const ROLE_PERMISSION_REPOSITORY = 'ROLE_PERMISSION_REPOSITORY';

export interface ResolvedPermission {
  key: string;
  conditions: Record<string, any> | null;
}

export interface IRolePermissionRepository extends IBaseRepository<RolePermission> {
  findByRoleId(roleId: string): Promise<RolePermission[]>;
  resolvePermissionsForRoles(roleNames: string[]): Promise<ResolvedPermission[]>;
  findByRoleAndPermission(roleId: string, permissionId: string): Promise<RolePermission | null>;
}
