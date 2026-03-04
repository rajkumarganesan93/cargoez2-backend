import { Module } from '@nestjs/common';
import { COUNTRY_REPOSITORY } from '../domain/repositories/country-repository.interface';
import { CountryRepository } from '../infrastructure/repositories/country.repository';
import { GetAllCountriesUseCase } from '../application/use-cases/get-all-countries.use-case';
import { GetCountryByIdUseCase } from '../application/use-cases/get-country-by-id.use-case';
import { CreateCountryUseCase } from '../application/use-cases/create-country.use-case';
import { UpdateCountryUseCase } from '../application/use-cases/update-country.use-case';
import { DeleteCountryUseCase } from '../application/use-cases/delete-country.use-case';
import { CountriesController } from './controllers/countries.controller';

@Module({
  controllers: [CountriesController],
  providers: [
    { provide: COUNTRY_REPOSITORY, useClass: CountryRepository },
    GetAllCountriesUseCase,
    GetCountryByIdUseCase,
    CreateCountryUseCase,
    UpdateCountryUseCase,
    DeleteCountryUseCase,
  ],
  exports: [
    GetAllCountriesUseCase,
    GetCountryByIdUseCase,
    CreateCountryUseCase,
    UpdateCountryUseCase,
    DeleteCountryUseCase,
  ],
})
export class CountriesModule {}
