import { Module } from '@nestjs/common';
import { AdminAccessControlController } from '../controllers/admin-access-control.controller';
import {
  AdminRoleRepository,
  AdminPermissionRepository,
  AdminRolePermissionRepository,
  SysAdminRoleRepository,
} from '../../infrastructure/repositories/admin-access-control.repository';

@Module({
  controllers: [AdminAccessControlController],
  providers: [
    AdminRoleRepository,
    AdminPermissionRepository,
    AdminRolePermissionRepository,
    SysAdminRoleRepository,
  ],
  exports: [
    AdminRoleRepository,
    AdminPermissionRepository,
    AdminRolePermissionRepository,
    SysAdminRoleRepository,
  ],
})
export class AdminAccessControlModule {}
