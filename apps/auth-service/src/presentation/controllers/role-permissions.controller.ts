import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { RequirePermission, Public, getContext } from '@cargoez/infrastructure';
import { GetRolePermissionsUseCase } from '../../application/use-cases/role-permissions/get-role-permissions.use-case';
import { AssignPermissionUseCase } from '../../application/use-cases/role-permissions/assign-permission.use-case';
import { RevokePermissionUseCase } from '../../application/use-cases/role-permissions/revoke-permission.use-case';
import { ResolvePermissionsUseCase } from '../../application/use-cases/role-permissions/resolve-permissions.use-case';
import { GetMyPermissionsUseCase } from '../../application/use-cases/role-permissions/get-my-permissions.use-case';
import { AssignPermissionDto } from '../dto/assign-permission.dto';

@ApiTags('Role Permissions')
@ApiBearerAuth()
@Controller()
export class RolePermissionsController {
  constructor(
    private readonly getRolePermissions: GetRolePermissionsUseCase,
    private readonly assignPermission: AssignPermissionUseCase,
    private readonly revokePermission: RevokePermissionUseCase,
    private readonly resolvePermissions: ResolvePermissionsUseCase,
    private readonly getMyPermissions: GetMyPermissionsUseCase,
  ) {}

  @Get('roles/:id/permissions')
  async findByRole(@Param('id') id: string) {
    const permissions = await this.getRolePermissions.execute(id);
    return createSuccessResponse(MessageCode.LIST_FETCHED, permissions);
  }

  @Post('roles/:id/permissions')
  @RequirePermission('user-management.permissions.create')
  async assign(@Param('id') id: string, @Body() dto: AssignPermissionDto) {
    const rp = await this.assignPermission.execute({
      roleId: id,
      permissionId: dto.permissionId,
      conditions: dto.conditions,
    });
    return createSuccessResponse(MessageCode.CREATED, rp);
  }

  @Delete('roles/:roleId/permissions/:permId')
  @RequirePermission('user-management.permissions.delete')
  async revoke(@Param('roleId') roleId: string, @Param('permId') permId: string) {
    await this.revokePermission.execute(roleId, permId);
    return createSuccessResponse(MessageCode.DELETED, null);
  }

  @Get('resolve-permissions')
  @Public()
  @ApiQuery({ name: 'roles', required: true, type: String, description: 'Comma-separated role names' })
  async resolve(@Query('roles') roles: string) {
    const roleNames = roles.split(',').map((r) => r.trim()).filter(Boolean);
    const permissions = await this.resolvePermissions.execute(roleNames);
    return createSuccessResponse(MessageCode.FETCHED, { permissions });
  }

  @Get('me/permissions')
  async myPermissions() {
    const context = getContext();
    const roleNames = context.roles || [];
    const result = await this.getMyPermissions.execute(roleNames);
    return createSuccessResponse(MessageCode.FETCHED, result);
  }
}
