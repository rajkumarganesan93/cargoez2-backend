import type { IRepository } from '@rajkumarganesan93/domain';
import type { Country } from '../entities/Country.js';

export interface CreateCountryInput {
  code: string;
  name: string;
}

export interface UpdateCountryInput {
  code?: string;
  name?: string;
}

export interface ICountryRepository extends IRepository<Country, CreateCountryInput, UpdateCountryInput> {}
