import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { RequirePermission } from '@cargoez/infrastructure';
import { MetaDataRepository, MetaDataDetailRepository } from '../../infrastructure/repositories/meta-data.repository';
import {
  CreateMetaDataDto,
  UpdateMetaDataDto,
  CreateMetaDataDetailDto,
  UpdateMetaDataDetailDto,
} from '../dto/metadata.dto';

@ApiTags('Metadata')
@ApiBearerAuth()
@Controller('metadata')
export class MetadataController {
  constructor(
    private readonly metaDataRepo: MetaDataRepository,
    private readonly metaDataDetailRepo: MetaDataDetailRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all metadata with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
  ) {
    const result = await this.metaDataRepo.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
      search,
      searchFields: ['code', 'name'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Get metadata by UID' })
  async findOne(@Param('uid') uid: string) {
    const entity = await this.metaDataRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Metadata not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post()
  @RequirePermission('metadata.create')
  @ApiOperation({ summary: 'Create metadata' })
  async create(@Body() dto: CreateMetaDataDto) {
    const entity = await this.metaDataRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put(':uid')
  @RequirePermission('metadata.update')
  @ApiOperation({ summary: 'Update metadata' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateMetaDataDto) {
    const entity = await this.metaDataRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete(':uid')
  @RequirePermission('metadata.delete')
  @ApiOperation({ summary: 'Delete metadata' })
  async remove(@Param('uid') uid: string) {
    await this.metaDataRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }

  @Get(':uid/details')
  @ApiOperation({ summary: 'Get details for a metadata entry' })
  async findDetails(@Param('uid') uid: string) {
    const details = await this.metaDataDetailRepo.findByMetaDataUid(uid);
    return createSuccessResponse(MessageCode.LIST_FETCHED, details);
  }

  @Post('details')
  @RequirePermission('metadata.create')
  @ApiOperation({ summary: 'Create metadata detail' })
  async createDetail(@Body() dto: CreateMetaDataDetailDto) {
    const entity = await this.metaDataDetailRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put('details/:uid')
  @RequirePermission('metadata.update')
  @ApiOperation({ summary: 'Update metadata detail' })
  async updateDetail(@Param('uid') uid: string, @Body() dto: UpdateMetaDataDetailDto) {
    const entity = await this.metaDataDetailRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete('details/:uid')
  @RequirePermission('metadata.delete')
  @ApiOperation({ summary: 'Delete metadata detail' })
  async removeDetail(@Param('uid') uid: string) {
    await this.metaDataDetailRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
