import type { Country } from '../entities/Country.js';

export interface ICountryRepository {
  findById(id: string): Promise<Country | null>;
  findAll(): Promise<Country[]>;
  findByCode(code: string): Promise<Country | null>;
}
