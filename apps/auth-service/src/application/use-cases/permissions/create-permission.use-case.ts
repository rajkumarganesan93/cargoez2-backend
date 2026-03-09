import { Inject, Injectable } from '@nestjs/common';
import { AlreadyExistsException, NotFoundException } from '@cargoez/api';
import { Permission } from '../../../domain/entities/permission.entity';
import { IPermissionRepository, PERMISSION_REPOSITORY } from '../../../domain/repositories/permission-repository.interface';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../domain/repositories/module-repository.interface';
import { IScreenRepository, SCREEN_REPOSITORY } from '../../../domain/repositories/screen-repository.interface';
import { IOperationRepository, OPERATION_REPOSITORY } from '../../../domain/repositories/operation-repository.interface';

@Injectable()
export class CreatePermissionUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY) private readonly permissionRepo: IPermissionRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
    @Inject(SCREEN_REPOSITORY) private readonly screenRepo: IScreenRepository,
    @Inject(OPERATION_REPOSITORY) private readonly operationRepo: IOperationRepository,
  ) {}

  async execute(data: { moduleId: string; screenId: string; operationId: string }): Promise<Permission> {
    const mod = await this.moduleRepo.findById(data.moduleId);
    if (!mod) throw new NotFoundException('Module');

    const screen = await this.screenRepo.findById(data.screenId);
    if (!screen) throw new NotFoundException('Screen');

    const operation = await this.operationRepo.findById(data.operationId);
    if (!operation) throw new NotFoundException('Operation');

    const permissionKey = `${mod.code}.${screen.code}.${operation.code}`;
    const existing = await this.permissionRepo.findByKey(permissionKey);
    if (existing) throw new AlreadyExistsException('Permission');

    return this.permissionRepo.save({
      moduleId: data.moduleId,
      screenId: data.screenId,
      operationId: data.operationId,
      permissionKey,
    } as Partial<Permission>);
  }
}
