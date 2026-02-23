import type { ICountryRepository } from '../../domain/repositories/ICountryRepository.js';
import type { Country } from '../../domain/entities/Country.js';

export class GetCountryByIdUseCase {
  constructor(private readonly countryRepository: ICountryRepository) {}

  async execute(id: string): Promise<Country | null> {
    return this.countryRepository.findById(id);
  }
}
