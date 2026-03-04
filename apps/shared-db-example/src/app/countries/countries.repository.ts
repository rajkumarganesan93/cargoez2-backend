import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { Country } from './entities/country.entity';

@Injectable()
export class CountriesRepository extends BaseRepository<Country> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'countries');
  }
}
