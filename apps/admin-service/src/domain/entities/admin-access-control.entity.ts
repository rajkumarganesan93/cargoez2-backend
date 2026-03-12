import { BaseEntity } from '@cargoez/domain';

export interface AdminRoleEntity extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
}

export interface AdminPermissionEntity extends BaseEntity {
  moduleUid: string;
  operationUid: string;
  permissionKey: string;
}

export interface AdminRolePermissionEntity extends BaseEntity {
  adminRoleUid: string;
  adminPermissionUid: string;
  conditions?: Record<string, any>;
  grantedBy?: string;
}

export interface SysAdminRoleEntity extends BaseEntity {
  sysAdminUid: string;
  adminRoleUid: string;
}
