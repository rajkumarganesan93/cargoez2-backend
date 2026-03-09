import { IBaseRepository } from '@cargoez/domain';
import { AppModule } from '../entities/module.entity';

export const MODULE_REPOSITORY = 'MODULE_REPOSITORY';

export interface IModuleRepository extends IBaseRepository<AppModule> {
  findByCode(code: string): Promise<AppModule | null>;
}
