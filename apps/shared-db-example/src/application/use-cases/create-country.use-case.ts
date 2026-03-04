import { Inject, Injectable } from '@nestjs/common';
import { Country } from '../../domain/entities/country.entity';
import { ICountryRepository, COUNTRY_REPOSITORY } from '../../domain/repositories/country-repository.interface';

@Injectable()
export class CreateCountryUseCase {
  constructor(@Inject(COUNTRY_REPOSITORY) private readonly countryRepo: ICountryRepository) {}

  execute(data: { name: string; code: string }): Promise<Country> {
    return this.countryRepo.save(data as Partial<Country>);
  }
}
