import {
  Controller,
  Get,
  Post,
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
import { GetAllPermissionsUseCase } from '../../application/use-cases/permissions/get-all-permissions.use-case';
import { CreatePermissionUseCase } from '../../application/use-cases/permissions/create-permission.use-case';
import { DeletePermissionUseCase } from '../../application/use-cases/permissions/delete-permission.use-case';
import { CreatePermissionDto } from '../dto/create-permission.dto';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly getAllPermissions: GetAllPermissionsUseCase,
    private readonly createPermission: CreatePermissionUseCase,
    private readonly deletePermission: DeletePermissionUseCase,
  ) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    const result = await this.getAllPermissions.execute({
      page, limit, search, searchFields: ['permission_key'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Post()
  @RequirePermission('user-management.permissions.create')
  async create(@Body() dto: CreatePermissionDto) {
    const permission = await this.createPermission.execute(dto);
    return createSuccessResponse(MessageCode.CREATED, permission);
  }

  @Delete(':id')
  @RequirePermission('user-management.permissions.delete')
  async remove(@Param('id') id: string) {
    await this.deletePermission.execute(id);
    return createSuccessResponse(MessageCode.DELETED, null);
  }
}
