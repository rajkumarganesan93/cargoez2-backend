import { Module } from '@nestjs/common';
import { SCREEN_REPOSITORY } from '../domain/repositories/screen-repository.interface';
import { MODULE_REPOSITORY } from '../domain/repositories/module-repository.interface';
import { ScreenRepository } from '../infrastructure/repositories/screen.repository';
import { ModuleRepository } from '../infrastructure/repositories/module.repository';
import { GetScreensByModuleUseCase } from '../application/use-cases/screens/get-screens-by-module.use-case';
import { CreateScreenUseCase } from '../application/use-cases/screens/create-screen.use-case';
import { UpdateScreenUseCase } from '../application/use-cases/screens/update-screen.use-case';
import { DeleteScreenUseCase } from '../application/use-cases/screens/delete-screen.use-case';
import { ScreensController } from './controllers/screens.controller';

@Module({
  controllers: [ScreensController],
  providers: [
    { provide: SCREEN_REPOSITORY, useClass: ScreenRepository },
    { provide: MODULE_REPOSITORY, useClass: ModuleRepository },
    GetScreensByModuleUseCase,
    CreateScreenUseCase,
    UpdateScreenUseCase,
    DeleteScreenUseCase,
  ],
  exports: [SCREEN_REPOSITORY],
})
export class ScreensModule {}
