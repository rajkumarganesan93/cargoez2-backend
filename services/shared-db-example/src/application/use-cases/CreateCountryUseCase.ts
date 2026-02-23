import { ConflictError } from '@rajkumarganesan93/infrastructure';
import type { ICountryRepository } from '../../domain/repositories/ICountryRepository.js';
import type { Country } from '../../domain/entities/Country.js';

export interface CreateCountryInput {
  code: string;
  name: string;
}

export class CreateCountryUseCase {
  constructor(private readonly countryRepository: ICountryRepository) {}

  async execute(input: CreateCountryInput): Promise<Country> {
    const existing = await this.countryRepository.findOne({ code: input.code });
    if (existing) {
      throw new ConflictError('Country with this code already exists');
    }
    return this.countryRepository.save(input);
  }
}
