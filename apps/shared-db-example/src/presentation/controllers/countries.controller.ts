import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { Roles } from '@cargoez/infrastructure';
import { GetAllCountriesUseCase } from '../../application/use-cases/get-all-countries.use-case';
import { GetCountryByIdUseCase } from '../../application/use-cases/get-country-by-id.use-case';
import { CreateCountryUseCase } from '../../application/use-cases/create-country.use-case';
import { UpdateCountryUseCase } from '../../application/use-cases/update-country.use-case';
import { DeleteCountryUseCase } from '../../application/use-cases/delete-country.use-case';
import { CreateCountryDto } from '../dto/create-country.dto';
import { UpdateCountryDto } from '../dto/update-country.dto';

@ApiTags('Countries')
@ApiBearerAuth()
@Controller('countries')
export class CountriesController {
  constructor(
    private readonly getAllCountries: GetAllCountriesUseCase,
    private readonly getCountryById: GetCountryByIdUseCase,
    private readonly createCountry: CreateCountryUseCase,
    private readonly updateCountry: UpdateCountryUseCase,
    private readonly deleteCountry: DeleteCountryUseCase,
  ) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
    @Query('search') search?: string,
  ) {
    const result = await this.getAllCountries.execute({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      searchFields: ['name', 'code'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const country = await this.getCountryById.execute(id);
    return createSuccessResponse(MessageCode.FETCHED, country);
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateCountryDto) {
    const country = await this.createCountry.execute(dto);
    return createSuccessResponse(MessageCode.CREATED, country);
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    const country = await this.updateCountry.execute(id, dto);
    return createSuccessResponse(MessageCode.UPDATED, country);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    await this.deleteCountry.execute(id);
    return createSuccessResponse(MessageCode.DELETED, null);
  }
}
