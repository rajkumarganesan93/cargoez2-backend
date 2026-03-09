import { Module } from '@nestjs/common';
import { ROLE_PERMISSION_REPOSITORY } from '../domain/repositories/role-permission-repository.interface';
import { ROLE_REPOSITORY } from '../domain/repositories/role-repository.interface';
import { PERMISSION_REPOSITORY } from '../domain/repositories/permission-repository.interface';
import { RolePermissionRepository } from '../infrastructure/repositories/role-permission.repository';
import { RoleRepository } from '../infrastructure/repositories/role.repository';
import { PermissionRepository } from '../infrastructure/repositories/permission.repository';
import { GetRolePermissionsUseCase } from '../application/use-cases/role-permissions/get-role-permissions.use-case';
import { AssignPermissionUseCase } from '../application/use-cases/role-permissions/assign-permission.use-case';
import { RevokePermissionUseCase } from '../application/use-cases/role-permissions/revoke-permission.use-case';
import { ResolvePermissionsUseCase } from '../application/use-cases/role-permissions/resolve-permissions.use-case';
import { GetMyPermissionsUseCase } from '../application/use-cases/role-permissions/get-my-permissions.use-case';
import { RolePermissionsController } from './controllers/role-permissions.controller';

@Module({
  controllers: [RolePermissionsController],
  providers: [
    { provide: ROLE_PERMISSION_REPOSITORY, useClass: RolePermissionRepository },
    { provide: ROLE_REPOSITORY, useClass: RoleRepository },
    { provide: PERMISSION_REPOSITORY, useClass: PermissionRepository },
    GetRolePermissionsUseCase,
    AssignPermissionUseCase,
    RevokePermissionUseCase,
    ResolvePermissionsUseCase,
    GetMyPermissionsUseCase,
  ],
  exports: [ROLE_PERMISSION_REPOSITORY],
})
export class RolePermissionsModule {}
