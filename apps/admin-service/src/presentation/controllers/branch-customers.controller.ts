import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { BranchCustomerRepository } from '../../infrastructure/repositories/branch-customer.repository';
import { RelBranchCustomerRepository } from '../../infrastructure/repositories/rel-branch-customer.repository';
import { CreateBranchCustomerDto, UpdateBranchCustomerDto, AssignBranchesDto } from '../dto/branch-customer.dto';

@ApiTags('Branch Customers')
@ApiBearerAuth()
@Controller('branch-customers')
export class BranchCustomersController {
  constructor(
    private readonly branchCustomerRepo: BranchCustomerRepository,
    private readonly relBranchCustomerRepo: RelBranchCustomerRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List branch customers with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const result = await this.branchCustomerRepo.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      searchFields: ['first_name', 'last_name', 'company_name', 'email'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Get a branch customer by UID' })
  async findOne(@Param('uid') uid: string) {
    const customer = await this.branchCustomerRepo.findByUid(uid);
    if (!customer) throw new NotFoundException('Branch customer not found');
    return createSuccessResponse(MessageCode.FETCHED, customer);
  }

  @Post()
  @ApiOperation({ summary: 'Create a branch customer' })
  async create(@Body() dto: CreateBranchCustomerDto) {
    const { branchUids, ...customerData } = dto;

    const customer = await this.branchCustomerRepo.save(customerData);

    if (branchUids?.length) {
      await Promise.all(
        branchUids.map((branchUid) =>
          this.relBranchCustomerRepo.save({
            branchUid,
            branchCustomerUid: customer.uid,
          }),
        ),
      );
    }

    return createSuccessResponse(MessageCode.CREATED, customer);
  }

  @Put(':uid')
  @ApiOperation({ summary: 'Update a branch customer' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateBranchCustomerDto) {
    const existing = await this.branchCustomerRepo.findByUid(uid);
    if (!existing) throw new NotFoundException('Branch customer not found');

    const updated = await this.branchCustomerRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, updated);
  }

  @Delete(':uid')
  @ApiOperation({ summary: 'Delete a branch customer' })
  async remove(@Param('uid') uid: string) {
    const existing = await this.branchCustomerRepo.findByUid(uid);
    if (!existing) throw new NotFoundException('Branch customer not found');

    await this.relBranchCustomerRepo.deleteByBranchCustomerUid(uid);
    await this.branchCustomerRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }

  @Post(':uid/branches')
  @ApiOperation({ summary: 'Assign branch customer to branches' })
  async assignBranches(@Param('uid') uid: string, @Body() dto: AssignBranchesDto) {
    const existing = await this.branchCustomerRepo.findByUid(uid);
    if (!existing) throw new NotFoundException('Branch customer not found');

    const results = await Promise.all(
      dto.branchUids.map((branchUid) =>
        this.relBranchCustomerRepo.save({
          branchUid,
          branchCustomerUid: uid,
        }),
      ),
    );

    return createSuccessResponse(MessageCode.CREATED, results);
  }
}
