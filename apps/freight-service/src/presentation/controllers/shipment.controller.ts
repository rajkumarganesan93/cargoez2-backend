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
import { ShipmentRepository } from '../../infrastructure/repositories/shipment.repository';
import { CreateShipmentDto, UpdateShipmentDto } from '../dto/shipment.dto';

@ApiTags('Shipments')
@ApiBearerAuth()
@Controller('shipments')
export class ShipmentController {
  constructor(private readonly shipmentRepo: ShipmentRepository) {}

  @Get()
  @RequirePermission('freight.read')
  @ApiOperation({ summary: 'List shipments with pagination' })
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
    const result = await this.shipmentRepo.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
      search,
      searchFields: ['shipment_number', 'origin', 'destination', 'shipper_name', 'consignee_name'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get(':uid')
  @RequirePermission('freight.read')
  @ApiOperation({ summary: 'Get shipment by UID' })
  async findOne(@Param('uid') uid: string) {
    const entity = await this.shipmentRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Shipment not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post()
  @RequirePermission('freight.create')
  @ApiOperation({ summary: 'Create shipment' })
  async create(@Body() dto: CreateShipmentDto) {
    const entity = await this.shipmentRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put(':uid')
  @RequirePermission('freight.update')
  @ApiOperation({ summary: 'Update shipment' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateShipmentDto) {
    const entity = await this.shipmentRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete(':uid')
  @RequirePermission('freight.delete')
  @ApiOperation({ summary: 'Delete shipment' })
  async remove(@Param('uid') uid: string) {
    await this.shipmentRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
