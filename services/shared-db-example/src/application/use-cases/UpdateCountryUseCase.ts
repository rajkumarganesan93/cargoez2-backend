import { ConflictError } from '@rajkumarganesan93/infrastructure';
import type { ICountryRepository, UpdateCountryInput } from '../../domain/repositories/ICountryRepository.js';
import type { Country } from '../../domain/entities/Country.js';

export class UpdateCountryUseCase {
  constructor(private readonly countryRepository: ICountryRepository) {}

  async execute(id: string, input: UpdateCountryInput): Promise<Country | null> {
    const existing = await this.countryRepository.findById(id);
    if (!existing) return null;
    if (input.code && input.code !== existing.code) {
      const byCode = await this.countryRepository.findOne({ code: input.code });
      if (byCode) throw new ConflictError('Country with this code already exists');
    }
    return this.countryRepository.update(id, input);
  }
}
