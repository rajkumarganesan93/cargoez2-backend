import { IBaseRepository } from '@cargoez/domain';
import { Country } from '../entities/country.entity';

export const COUNTRY_REPOSITORY = 'COUNTRY_REPOSITORY';

export type ICountryRepository = IBaseRepository<Country>;
