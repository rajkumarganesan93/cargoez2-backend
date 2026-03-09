import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { Screen } from '../../../domain/entities/screen.entity';
import { IScreenRepository, SCREEN_REPOSITORY } from '../../../domain/repositories/screen-repository.interface';

@Injectable()
export class UpdateScreenUseCase {
  constructor(@Inject(SCREEN_REPOSITORY) private readonly screenRepo: IScreenRepository) {}

  async execute(id: string, data: Partial<Screen>): Promise<Screen> {
    const existing = await this.screenRepo.findById(id);
    if (!existing) throw new NotFoundException('Screen');
    return this.screenRepo.update(id, data);
  }
}
