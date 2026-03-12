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
import { SysAdminRepository } from '../../infrastructure/repositories/sys-admin.repository';
import { CreateSysAdminDto, UpdateSysAdminDto } from '../dto/sys-admin.dto';

@ApiTags('System Admins')
@ApiBearerAuth()
@Controller('sys-admins')
export class SysAdminsController {
  constructor(private readonly sysAdminRepo: SysAdminRepository) {}

  @Get()
  @ApiOperation({ summary: 'List all system admins with pagination' })
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
    const result = await this.sysAdminRepo.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
      search,
      searchFields: ['email', 'first_name', 'last_name'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Get system admin by UID' })
  async findOne(@Param('uid') uid: string) {
    const entity = await this.sysAdminRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('System admin not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post()
  @ApiOperation({ summary: 'Create system admin' })
  async create(@Body() dto: CreateSysAdminDto) {
    const entity = await this.sysAdminRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put(':uid')
  @ApiOperation({ summary: 'Update system admin' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateSysAdminDto) {
    const entity = await this.sysAdminRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete(':uid')
  @ApiOperation({ summary: 'Delete system admin' })
  async remove(@Param('uid') uid: string) {
    await this.sysAdminRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
