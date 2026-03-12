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
import { ProductRepository, ProductDetailRepository } from '../../infrastructure/repositories/product.repository';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductDetailDto,
  UpdateProductDetailDto,
} from '../dto/product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly productDetailRepo: ProductDetailRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all products with pagination' })
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
    const result = await this.productRepo.findAll({
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
  @ApiOperation({ summary: 'Get product by UID' })
  async findOne(@Param('uid') uid: string) {
    const entity = await this.productRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Product not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Create product' })
  async create(@Body() dto: CreateProductDto) {
    const entity = await this.productRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put(':uid')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Update product' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateProductDto) {
    const entity = await this.productRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete(':uid')
  @RequirePermission('products.delete')
  @ApiOperation({ summary: 'Delete product' })
  async remove(@Param('uid') uid: string) {
    await this.productRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }

  // ── Product Details ──

  @Get(':uid/details')
  @ApiOperation({ summary: 'Get details for a product' })
  async findDetails(@Param('uid') uid: string) {
    const details = await this.productDetailRepo.findByProductUid(uid);
    return createSuccessResponse(MessageCode.LIST_FETCHED, details);
  }

  @Post('details')
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Create product detail' })
  async createDetail(@Body() dto: CreateProductDetailDto) {
    const entity = await this.productDetailRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put('details/:uid')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Update product detail' })
  async updateDetail(@Param('uid') uid: string, @Body() dto: UpdateProductDetailDto) {
    const entity = await this.productDetailRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete('details/:uid')
  @RequirePermission('products.delete')
  @ApiOperation({ summary: 'Delete product detail' })
  async removeDetail(@Param('uid') uid: string) {
    await this.productDetailRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
