import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { RequirePermission } from '@cargoez/infrastructure';
import { GetAllModulesUseCase } from '../../application/use-cases/modules/get-all-modules.use-case';
import { CreateModuleUseCase } from '../../application/use-cases/modules/create-module.use-case';
import { UpdateModuleUseCase } from '../../application/use-cases/modules/update-module.use-case';
import { DeleteModuleUseCase } from '../../application/use-cases/modules/delete-module.use-case';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('modules')
export class ModulesController {
  constructor(
    private readonly getAllModules: GetAllModulesUseCase,
    private readonly createModule: CreateModuleUseCase,
    private readonly updateModule: UpdateModuleUseCase,
    private readonly deleteModule: DeleteModuleUseCase,
  ) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'sortOrder' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'asc' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('sortOrder')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('asc')) sortOrder: 'asc' | 'desc',
  ) {
    const result = await this.getAllModules.execute({ page, limit, sortBy, sortOrder });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Post()
  @RequirePermission('user-management.permissions.create')
  async create(@Body() dto: CreateModuleDto) {
    const mod = await this.createModule.execute(dto);
    return createSuccessResponse(MessageCode.CREATED, mod);
  }

  @Put(':id')
  @RequirePermission('user-management.permissions.update')
  async update(@Param('id') id: string, @Body() dto: UpdateModuleDto) {
    const mod = await this.updateModule.execute(id, dto);
    return createSuccessResponse(MessageCode.UPDATED, mod);
  }

  @Delete(':id')
  @RequirePermission('user-management.permissions.delete')
  async remove(@Param('id') id: string) {
    await this.deleteModule.execute(id);
    return createSuccessResponse(MessageCode.DELETED, null);
  }
}
