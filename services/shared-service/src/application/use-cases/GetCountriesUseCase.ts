import type { ICountryRepository } from '../../domain/repositories/ICountryRepository.js';
import type { Country } from '../../domain/entities/Country.js';

export class GetCountriesUseCase {
  constructor(private readonly countryRepository: ICountryRepository) {}

  async execute(): Promise<Country[]> {
    return this.countryRepository.findAll();
  }
}
