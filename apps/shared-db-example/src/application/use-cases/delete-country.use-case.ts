import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { ICountryRepository, COUNTRY_REPOSITORY } from '../../domain/repositories/country-repository.interface';

@Injectable()
export class DeleteCountryUseCase {
  constructor(@Inject(COUNTRY_REPOSITORY) private readonly countryRepo: ICountryRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.countryRepo.findById(id);
    if (!existing) throw new NotFoundException('Country');
    return this.countryRepo.delete(id);
  }
}
