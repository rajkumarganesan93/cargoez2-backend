import { Module } from '@nestjs/common';
import { MODULE_REPOSITORY } from '../domain/repositories/module-repository.interface';
import { ModuleRepository } from '../infrastructure/repositories/module.repository';
import { GetAllModulesUseCase } from '../application/use-cases/modules/get-all-modules.use-case';
import { CreateModuleUseCase } from '../application/use-cases/modules/create-module.use-case';
import { UpdateModuleUseCase } from '../application/use-cases/modules/update-module.use-case';
import { DeleteModuleUseCase } from '../application/use-cases/modules/delete-module.use-case';
import { ModulesController } from './controllers/modules.controller';

@Module({
  controllers: [ModulesController],
  providers: [
    { provide: MODULE_REPOSITORY, useClass: ModuleRepository },
    GetAllModulesUseCase,
    CreateModuleUseCase,
    UpdateModuleUseCase,
    DeleteModuleUseCase,
  ],
  exports: [MODULE_REPOSITORY],
})
export class ModulesModule {}
