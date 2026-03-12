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
import {
  ModuleCatalogRepository,
  OperationCatalogRepository,
} from '../../infrastructure/repositories/master-catalog.repository';
import {
  CreateModuleDto,
  UpdateModuleDto,
  CreateOperationDto,
  UpdateOperationDto,
} from '../dto/master-catalog.dto';

@ApiTags('Master Catalog')
@ApiBearerAuth()
@Controller('master-catalog')
export class MasterCatalogController {
  constructor(
    private readonly moduleRepo: ModuleCatalogRepository,
    private readonly operationRepo: OperationCatalogRepository,
  ) {}

  // ── Modules ──

  @Get('modules')
  @ApiOperation({ summary: 'List all modules with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAllModules(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
  ) {
    const result = await this.moduleRepo.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
      search,
      searchFields: ['code', 'name'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get('modules/:uid')
  @ApiOperation({ summary: 'Get module by UID' })
  async findOneModule(@Param('uid') uid: string) {
    const entity = await this.moduleRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Module not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post('modules')
  @RequirePermission('master-catalog.create')
  @ApiOperation({ summary: 'Create module' })
  async createModule(@Body() dto: CreateModuleDto) {
    const entity = await this.moduleRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put('modules/:uid')
  @RequirePermission('master-catalog.update')
  @ApiOperation({ summary: 'Update module' })
  async updateModule(@Param('uid') uid: string, @Body() dto: UpdateModuleDto) {
    const entity = await this.moduleRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete('modules/:uid')
  @RequirePermission('master-catalog.delete')
  @ApiOperation({ summary: 'Delete module' })
  async removeModule(@Param('uid') uid: string) {
    await this.moduleRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }

  // ── Operations ──

  @Get('operations')
  @ApiOperation({ summary: 'List all operations with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAllOperations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
  ) {
    const result = await this.operationRepo.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
      search,
      searchFields: ['code', 'name'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get('operations/:uid')
  @ApiOperation({ summary: 'Get operation by UID' })
  async findOneOperation(@Param('uid') uid: string) {
    const entity = await this.operationRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Operation not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post('operations')
  @RequirePermission('master-catalog.create')
  @ApiOperation({ summary: 'Create operation' })
  async createOperation(@Body() dto: CreateOperationDto) {
    const entity = await this.operationRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put('operations/:uid')
  @RequirePermission('master-catalog.update')
  @ApiOperation({ summary: 'Update operation' })
  async updateOperation(@Param('uid') uid: string, @Body() dto: UpdateOperationDto) {
    const entity = await this.operationRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete('operations/:uid')
  @RequirePermission('master-catalog.delete')
  @ApiOperation({ summary: 'Delete operation' })
  async removeOperation(@Param('uid') uid: string) {
    await this.operationRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
