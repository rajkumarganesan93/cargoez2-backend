import type { PaginatedResult, ListOptions } from '@rajkumarganesan93/domain';
import type { Country } from '../../domain/entities/Country.js';
import type { ICountryRepository } from '../../domain/repositories/ICountryRepository.js';

export class GetAllCountriesUseCase {
  constructor(private readonly countryRepository: ICountryRepository) {}

  async execute(options?: ListOptions): Promise<PaginatedResult<Country>> {
    return this.countryRepository.findAll(options);
  }
}
