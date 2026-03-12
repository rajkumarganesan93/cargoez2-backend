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
import { BranchRepository } from '../../infrastructure/repositories/branch.repository';
import { CreateBranchDto, UpdateBranchDto } from '../dto/branch.dto';

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchRepo: BranchRepository) {}

  @Get()
  @ApiOperation({ summary: 'List all branches with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tenantUid', required: false, type: String, description: 'Filter by tenant UID' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('tenantUid') tenantUid?: string,
  ) {
    if (tenantUid) {
      const data = await this.branchRepo.findByTenantUid(tenantUid);
      return createSuccessResponse(MessageCode.LIST_FETCHED, data);
    }

    const result = await this.branchRepo.findAll({
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
  @ApiOperation({ summary: 'Get branch by UID' })
  async findOne(@Param('uid') uid: string) {
    const entity = await this.branchRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Branch not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post()
  @RequirePermission('branches.create')
  @ApiOperation({ summary: 'Create branch' })
  async create(@Body() dto: CreateBranchDto) {
    const entity = await this.branchRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put(':uid')
  @RequirePermission('branches.update')
  @ApiOperation({ summary: 'Update branch' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateBranchDto) {
    const entity = await this.branchRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete(':uid')
  @RequirePermission('branches.delete')
  @ApiOperation({ summary: 'Delete branch' })
  async remove(@Param('uid') uid: string) {
    await this.branchRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
