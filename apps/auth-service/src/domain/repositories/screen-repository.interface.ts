import { IBaseRepository } from '@cargoez/domain';
import { Screen } from '../entities/screen.entity';

export const SCREEN_REPOSITORY = 'SCREEN_REPOSITORY';

export interface IScreenRepository extends IBaseRepository<Screen> {
  findByModuleId(moduleId: string): Promise<Screen[]>;
  findByCode(moduleId: string, code: string): Promise<Screen | null>;
}
