import * as crypto from 'crypto';
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RequirePermission } from '@cargoez/infrastructure';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { AppCustomerRepository } from '../../infrastructure/repositories/app-customer.repository';
import { AppCustomerCredentialRepository } from '../../infrastructure/repositories/app-customer-credential.repository';
import { CreateAppCustomerDto, UpdateAppCustomerDto } from '../dto/app-customer.dto';

@ApiTags('App Customers')
@ApiBearerAuth()
@Controller('app-customers')
export class AppCustomersController {
  constructor(
    private readonly appCustomerRepo: AppCustomerRepository,
    private readonly credentialRepo: AppCustomerCredentialRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List app customers with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tenantUid', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('tenantUid') tenantUid?: string,
  ) {
    if (tenantUid) {
      const data = await this.appCustomerRepo.findByTenantUid(tenantUid);
      return createSuccessResponse(MessageCode.LIST_FETCHED, data);
    }

    const result = await this.appCustomerRepo.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      searchFields: ['email', 'first_name', 'last_name'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Get an app customer by UID' })
  async findOne(@Param('uid') uid: string) {
    const customer = await this.appCustomerRepo.findByUid(uid);
    if (!customer) throw new NotFoundException('App customer not found');
    return createSuccessResponse(MessageCode.FETCHED, customer);
  }

  @Post()
  @RequirePermission('users.create')
  @ApiOperation({ summary: 'Create an app customer' })
  async create(@Body() dto: CreateAppCustomerDto) {
    const { password, ...customerData } = dto;

    const customer = await this.appCustomerRepo.save(customerData);

    if (password) {
      const hashed = crypto.createHash('sha256').update(password).digest('hex');
      await this.credentialRepo.save({
        appCustomerUid: customer.uid,
        credentialType: 'password',
        credentialValue: hashed,
      });
    }

    return createSuccessResponse(MessageCode.CREATED, customer);
  }

  @Put(':uid')
  @RequirePermission('users.update')
  @ApiOperation({ summary: 'Update an app customer' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateAppCustomerDto) {
    const existing = await this.appCustomerRepo.findByUid(uid);
    if (!existing) throw new NotFoundException('App customer not found');

    const updated = await this.appCustomerRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, updated);
  }

  @Delete(':uid')
  @RequirePermission('users.delete')
  @ApiOperation({ summary: 'Delete an app customer' })
  async remove(@Param('uid') uid: string) {
    const existing = await this.appCustomerRepo.findByUid(uid);
    if (!existing) throw new NotFoundException('App customer not found');

    await this.appCustomerRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
