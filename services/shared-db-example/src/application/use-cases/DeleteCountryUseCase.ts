import type { ICountryRepository } from '../../domain/repositories/ICountryRepository.js';

export class DeleteCountryUseCase {
  constructor(private readonly countryRepository: ICountryRepository) {}

  async execute(id: string): Promise<boolean> {
    return this.countryRepository.delete(id);
  }
}
