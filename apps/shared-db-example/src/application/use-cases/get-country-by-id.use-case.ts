import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { Country } from '../../domain/entities/country.entity';
import { ICountryRepository, COUNTRY_REPOSITORY } from '../../domain/repositories/country-repository.interface';

@Injectable()
export class GetCountryByIdUseCase {
  constructor(@Inject(COUNTRY_REPOSITORY) private readonly countryRepo: ICountryRepository) {}

  async execute(id: string): Promise<Country> {
    const country = await this.countryRepo.findById(id);
    if (!country) throw new NotFoundException('Country');
    return country;
  }
}
