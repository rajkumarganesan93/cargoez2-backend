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
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from '../dto/subscription.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  @Get()
  @ApiOperation({ summary: 'List all subscriptions with pagination' })
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
    const result = await this.subscriptionRepo.findAll({
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
  @ApiOperation({ summary: 'Get subscription by UID' })
  async findOne(@Param('uid') uid: string) {
    const entity = await this.subscriptionRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Subscription not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post()
  @RequirePermission('subscriptions.create')
  @ApiOperation({ summary: 'Create subscription' })
  async create(@Body() dto: CreateSubscriptionDto) {
    const entity = await this.subscriptionRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put(':uid')
  @RequirePermission('subscriptions.update')
  @ApiOperation({ summary: 'Update subscription' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateSubscriptionDto) {
    const entity = await this.subscriptionRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete(':uid')
  @RequirePermission('subscriptions.delete')
  @ApiOperation({ summary: 'Delete subscription' })
  async remove(@Param('uid') uid: string) {
    await this.subscriptionRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
