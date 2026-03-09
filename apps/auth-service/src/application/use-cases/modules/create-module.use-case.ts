import { Inject, Injectable } from '@nestjs/common';
import { AlreadyExistsException } from '@cargoez/api';
import { AppModule } from '../../../domain/entities/module.entity';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../domain/repositories/module-repository.interface';

@Injectable()
export class CreateModuleUseCase {
  constructor(@Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository) {}

  async execute(data: { code: string; name: string; description?: string; icon?: string; sortOrder?: number }): Promise<AppModule> {
    const existing = await this.moduleRepo.findByCode(data.code);
    if (existing) throw new AlreadyExistsException('Module');
    return this.moduleRepo.save({ ...data, isActive: true } as Partial<AppModule>);
  }
}
