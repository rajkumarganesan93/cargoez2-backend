import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { IScreenRepository, SCREEN_REPOSITORY } from '../../../domain/repositories/screen-repository.interface';

@Injectable()
export class DeleteScreenUseCase {
  constructor(@Inject(SCREEN_REPOSITORY) private readonly screenRepo: IScreenRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.screenRepo.findById(id);
    if (!existing) throw new NotFoundException('Screen');
    return this.screenRepo.delete(id);
  }
}
