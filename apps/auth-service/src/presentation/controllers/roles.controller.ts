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
import { GetAllRolesUseCase } from '../../application/use-cases/roles/get-all-roles.use-case';
import { GetRoleByIdUseCase } from '../../application/use-cases/roles/get-role-by-id.use-case';
import { CreateRoleUseCase } from '../../application/use-cases/roles/create-role.use-case';
import { UpdateRoleUseCase } from '../../application/use-cases/roles/update-role.use-case';
import { DeleteRoleUseCase } from '../../application/use-cases/roles/delete-role.use-case';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(
    private readonly getAllRoles: GetAllRolesUseCase,
    private readonly getRoleById: GetRoleByIdUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
  ) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
    @Query('search') search?: string,
  ) {
    const result = await this.getAllRoles.execute({
      page, limit, sortBy, sortOrder, search, searchFields: ['name', 'description'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const role = await this.getRoleById.execute(id);
    return createSuccessResponse(MessageCode.FETCHED, role);
  }

  @Post()
  @RequirePermission('user-management.roles.create')
  async create(@Body() dto: CreateRoleDto) {
    const role = await this.createRole.execute(dto);
    return createSuccessResponse(MessageCode.CREATED, role);
  }

  @Put(':id')
  @RequirePermission('user-management.roles.update')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const role = await this.updateRole.execute(id, dto);
    return createSuccessResponse(MessageCode.UPDATED, role);
  }

  @Delete(':id')
  @RequirePermission('user-management.roles.delete')
  async remove(@Param('id') id: string) {
    await this.deleteRole.execute(id);
    return createSuccessResponse(MessageCode.DELETED, null);
  }
}
