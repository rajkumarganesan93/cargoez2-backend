import { Injectable } from '@nestjs/common';
import { PaginationOptions, PaginatedResult } from '@cargoez/domain';
import { NotFoundException } from '@cargoez/api';
import { CountriesRepository } from './countries.repository';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountriesService {
  constructor(private readonly countriesRepository: CountriesRepository) {}

  async findAll(options: PaginationOptions): Promise<PaginatedResult<Country>> {
    return this.countriesRepository.findAll(options);
  }

  async findById(id: string): Promise<Country> {
    const country = await this.countriesRepository.findById(id);
    if (!country) throw new NotFoundException('Country');
    return country;
  }

  async create(dto: CreateCountryDto): Promise<Country> {
    return this.countriesRepository.save({ ...dto, id: undefined } as any);
  }

  async update(id: string, dto: UpdateCountryDto): Promise<Country> {
    await this.findById(id);
    return this.countriesRepository.update(id, dto as any);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    return this.countriesRepository.delete(id);
  }
}
