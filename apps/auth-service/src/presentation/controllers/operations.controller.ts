import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { RequirePermission } from '@cargoez/infrastructure';
import { GetAllOperationsUseCase } from '../../application/use-cases/operations/get-all-operations.use-case';
import { CreateOperationUseCase } from '../../application/use-cases/operations/create-operation.use-case';
import { CreateOperationDto } from '../dto/create-operation.dto';

@ApiTags('Operations')
@ApiBearerAuth()
@Controller('operations')
export class OperationsController {
  constructor(
    private readonly getAllOperations: GetAllOperationsUseCase,
    private readonly createOperation: CreateOperationUseCase,
  ) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const result = await this.getAllOperations.execute({ page, limit, sortBy: 'code', sortOrder: 'asc' });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Post()
  @RequirePermission('user-management.permissions.create')
  async create(@Body() dto: CreateOperationDto) {
    const operation = await this.createOperation.execute(dto);
    return createSuccessResponse(MessageCode.CREATED, operation);
  }
}
