import { Module } from '@nestjs/common';
import { PERMISSION_REPOSITORY } from '../domain/repositories/permission-repository.interface';
import { MODULE_REPOSITORY } from '../domain/repositories/module-repository.interface';
import { SCREEN_REPOSITORY } from '../domain/repositories/screen-repository.interface';
import { OPERATION_REPOSITORY } from '../domain/repositories/operation-repository.interface';
import { PermissionRepository } from '../infrastructure/repositories/permission.repository';
import { ModuleRepository } from '../infrastructure/repositories/module.repository';
import { ScreenRepository } from '../infrastructure/repositories/screen.repository';
import { OperationRepository } from '../infrastructure/repositories/operation.repository';
import { GetAllPermissionsUseCase } from '../application/use-cases/permissions/get-all-permissions.use-case';
import { CreatePermissionUseCase } from '../application/use-cases/permissions/create-permission.use-case';
import { DeletePermissionUseCase } from '../application/use-cases/permissions/delete-permission.use-case';
import { PermissionsController } from './controllers/permissions.controller';

@Module({
  controllers: [PermissionsController],
  providers: [
    { provide: PERMISSION_REPOSITORY, useClass: PermissionRepository },
    { provide: MODULE_REPOSITORY, useClass: ModuleRepository },
    { provide: SCREEN_REPOSITORY, useClass: ScreenRepository },
    { provide: OPERATION_REPOSITORY, useClass: OperationRepository },
    GetAllPermissionsUseCase,
    CreatePermissionUseCase,
    DeletePermissionUseCase,
  ],
  exports: [PERMISSION_REPOSITORY],
})
export class PermissionsModule {}
