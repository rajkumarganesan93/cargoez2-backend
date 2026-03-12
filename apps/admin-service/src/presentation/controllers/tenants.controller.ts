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
import { TenantRepository } from '../../infrastructure/repositories/tenant.repository';
import { CreateTenantDto, UpdateTenantDto } from '../dto/tenant.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantRepo: TenantRepository) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants with pagination' })
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
    const result = await this.tenantRepo.findAll({
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
  @ApiOperation({ summary: 'Get tenant by UID' })
  async findOne(@Param('uid') uid: string) {
    const entity = await this.tenantRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Tenant not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post()
  @RequirePermission('tenants.create')
  @ApiOperation({ summary: 'Create tenant' })
  async create(@Body() dto: CreateTenantDto) {
    const entity = await this.tenantRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put(':uid')
  @RequirePermission('tenants.update')
  @ApiOperation({ summary: 'Update tenant' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateTenantDto) {
    const entity = await this.tenantRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete(':uid')
  @RequirePermission('tenants.delete')
  @ApiOperation({ summary: 'Delete tenant' })
  async remove(@Param('uid') uid: string) {
    await this.tenantRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
