import { Module } from '@nestjs/common';
import { ROLE_REPOSITORY } from '../domain/repositories/role-repository.interface';
import { RoleRepository } from '../infrastructure/repositories/role.repository';
import { GetAllRolesUseCase } from '../application/use-cases/roles/get-all-roles.use-case';
import { GetRoleByIdUseCase } from '../application/use-cases/roles/get-role-by-id.use-case';
import { CreateRoleUseCase } from '../application/use-cases/roles/create-role.use-case';
import { UpdateRoleUseCase } from '../application/use-cases/roles/update-role.use-case';
import { DeleteRoleUseCase } from '../application/use-cases/roles/delete-role.use-case';
import { RolesController } from './controllers/roles.controller';

@Module({
  controllers: [RolesController],
  providers: [
    { provide: ROLE_REPOSITORY, useClass: RoleRepository },
    GetAllRolesUseCase,
    GetRoleByIdUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
  ],
  exports: [ROLE_REPOSITORY],
})
export class RolesModule {}
