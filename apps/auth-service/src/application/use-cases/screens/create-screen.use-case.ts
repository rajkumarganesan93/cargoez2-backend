import { Inject, Injectable } from '@nestjs/common';
import { AlreadyExistsException, NotFoundException } from '@cargoez/api';
import { Screen } from '../../../domain/entities/screen.entity';
import { IScreenRepository, SCREEN_REPOSITORY } from '../../../domain/repositories/screen-repository.interface';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../domain/repositories/module-repository.interface';

@Injectable()
export class CreateScreenUseCase {
  constructor(
    @Inject(SCREEN_REPOSITORY) private readonly screenRepo: IScreenRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
  ) {}

  async execute(data: { moduleId: string; code: string; name: string; description?: string; sortOrder?: number }): Promise<Screen> {
    const mod = await this.moduleRepo.findById(data.moduleId);
    if (!mod) throw new NotFoundException('Module');
    const existing = await this.screenRepo.findByCode(data.moduleId, data.code);
    if (existing) throw new AlreadyExistsException('Screen');
    return this.screenRepo.save({ ...data, isActive: true } as Partial<Screen>);
  }
}
