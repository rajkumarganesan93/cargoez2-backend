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
import { InvoiceRepository, InvoiceItemRepository } from '../../infrastructure/repositories/invoice.repository';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  CreateInvoiceItemDto,
  UpdateInvoiceItemDto,
} from '../dto/invoice.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly invoiceItemRepo: InvoiceItemRepository,
  ) {}

  @Get()
  @RequirePermission('books.read')
  @ApiOperation({ summary: 'List invoices with pagination' })
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
    const result = await this.invoiceRepo.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
      search,
      searchFields: ['invoice_number', 'status'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get(':uid')
  @RequirePermission('books.read')
  @ApiOperation({ summary: 'Get invoice by UID' })
  async findOne(@Param('uid') uid: string) {
    const entity = await this.invoiceRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Invoice not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post()
  @RequirePermission('books.create')
  @ApiOperation({ summary: 'Create invoice' })
  async create(@Body() dto: CreateInvoiceDto) {
    const entity = await this.invoiceRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put(':uid')
  @RequirePermission('books.update')
  @ApiOperation({ summary: 'Update invoice' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateInvoiceDto) {
    const entity = await this.invoiceRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete(':uid')
  @RequirePermission('books.delete')
  @ApiOperation({ summary: 'Delete invoice' })
  async remove(@Param('uid') uid: string) {
    await this.invoiceRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }

  @Get(':uid/items')
  @RequirePermission('books.read')
  @ApiOperation({ summary: 'List invoice items' })
  async findItems(@Param('uid') uid: string) {
    const items = await this.invoiceItemRepo.findByInvoiceUid(uid);
    return createSuccessResponse(MessageCode.LIST_FETCHED, items);
  }

  @Post(':uid/items')
  @RequirePermission('books.create')
  @ApiOperation({ summary: 'Add invoice item' })
  async createItem(@Param('uid') uid: string, @Body() dto: CreateInvoiceItemDto) {
    const entity = await this.invoiceItemRepo.save({ ...dto, invoiceUid: uid });
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put('items/:uid')
  @RequirePermission('books.update')
  @ApiOperation({ summary: 'Update invoice item' })
  async updateItem(@Param('uid') uid: string, @Body() dto: UpdateInvoiceItemDto) {
    const entity = await this.invoiceItemRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete('items/:uid')
  @RequirePermission('books.delete')
  @ApiOperation({ summary: 'Delete invoice item' })
  async removeItem(@Param('uid') uid: string) {
    await this.invoiceItemRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
