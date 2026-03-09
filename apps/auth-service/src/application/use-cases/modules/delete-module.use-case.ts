import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../domain/repositories/module-repository.interface';

@Injectable()
export class DeleteModuleUseCase {
  constructor(@Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.moduleRepo.findById(id);
    if (!existing) throw new NotFoundException('Module');
    return this.moduleRepo.delete(id);
  }
}
