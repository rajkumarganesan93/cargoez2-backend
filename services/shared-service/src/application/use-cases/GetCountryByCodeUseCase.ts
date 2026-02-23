import type { ICountryRepository } from '../../domain/repositories/ICountryRepository.js';
import type { Country } from '../../domain/entities/Country.js';

export class GetCountryByCodeUseCase {
  constructor(private readonly countryRepository: ICountryRepository) {}

  async execute(code: string): Promise<Country | null> {
    return this.countryRepository.findByCode(code);
  }
}
