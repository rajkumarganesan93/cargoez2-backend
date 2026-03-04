import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { Country } from '../../domain/entities/country.entity';
import { ICountryRepository, COUNTRY_REPOSITORY } from '../../domain/repositories/country-repository.interface';

@Injectable()
export class UpdateCountryUseCase {
  constructor(@Inject(COUNTRY_REPOSITORY) private readonly countryRepo: ICountryRepository) {}

  async execute(id: string, data: Partial<Country>): Promise<Country> {
    const existing = await this.countryRepo.findById(id);
    if (!existing) throw new NotFoundException('Country');
    return this.countryRepo.update(id, data);
  }
}
