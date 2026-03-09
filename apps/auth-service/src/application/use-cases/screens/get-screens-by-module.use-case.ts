import { Inject, Injectable } from '@nestjs/common';
import { Screen } from '../../../domain/entities/screen.entity';
import { IScreenRepository, SCREEN_REPOSITORY } from '../../../domain/repositories/screen-repository.interface';

@Injectable()
export class GetScreensByModuleUseCase {
  constructor(@Inject(SCREEN_REPOSITORY) private readonly screenRepo: IScreenRepository) {}

  execute(moduleId: string): Promise<Screen[]> {
    return this.screenRepo.findByModuleId(moduleId);
  }
}
