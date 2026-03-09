import { Inject, Injectable } from '@nestjs/common';
import { PaginationOptions, PaginatedResult } from '@cargoez/domain';
import { AppModule } from '../../../domain/entities/module.entity';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../domain/repositories/module-repository.interface';

@Injectable()
export class GetAllModulesUseCase {
  constructor(@Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository) {}

  execute(options: PaginationOptions): Promise<PaginatedResult<AppModule>> {
    return this.moduleRepo.findAll(options);
  }
}
