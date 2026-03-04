import { Inject, Injectable } from '@nestjs/common';
import { PaginationOptions, PaginatedResult } from '@cargoez/domain';
import { Country } from '../../domain/entities/country.entity';
import { ICountryRepository, COUNTRY_REPOSITORY } from '../../domain/repositories/country-repository.interface';

@Injectable()
export class GetAllCountriesUseCase {
  constructor(@Inject(COUNTRY_REPOSITORY) private readonly countryRepo: ICountryRepository) {}

  execute(options: PaginationOptions): Promise<PaginatedResult<Country>> {
    return this.countryRepo.findAll(options);
  }
}
