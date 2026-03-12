import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { RequirePermission } from '@cargoez/infrastructure';
import { AccessControlService } from '../../infrastructure/services/access-control.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto, AssignRoleDto } from '../dto/access-control.dto';

@ApiTags('Access Control')
@ApiBearerAuth()
@Controller('access-control')
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  // ── Roles ──

  @Get('roles')
  @ApiOperation({ summary: 'List all roles for a tenant' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async listRoles(@Query('tenantUid') tenantUid: string) {
    const result = await this.accessControlService.listRoles(tenantUid);
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get('roles/:uid')
  @ApiOperation({ summary: 'Get role by UID' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async getRole(@Param('uid') uid: string, @Query('tenantUid') tenantUid: string) {
    const result = await this.accessControlService.getRoleByUid(tenantUid, uid);
    return createSuccessResponse(MessageCode.FETCHED, result);
  }

  @Post('roles')
  @RequirePermission('access-control.create')
  @ApiOperation({ summary: 'Create a role' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async createRole(@Query('tenantUid') tenantUid: string, @Body() dto: CreateRoleDto) {
    const result = await this.accessControlService.createRole(tenantUid, dto);
    return createSuccessResponse(MessageCode.CREATED, result);
  }

  @Put('roles/:uid')
  @RequirePermission('access-control.update')
  @ApiOperation({ summary: 'Update a role' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async updateRole(
    @Param('uid') uid: string,
    @Query('tenantUid') tenantUid: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const result = await this.accessControlService.updateRole(tenantUid, uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, result);
  }

  @Delete('roles/:uid')
  @RequirePermission('access-control.delete')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async deleteRole(@Param('uid') uid: string, @Query('tenantUid') tenantUid: string) {
    await this.accessControlService.deleteRole(tenantUid, uid);
    return createSuccessResponse(MessageCode.DELETED);
  }

  // ── Permissions ──

  @Get('permissions')
  @ApiOperation({ summary: 'List all permissions for a tenant' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async listPermissions(@Query('tenantUid') tenantUid: string) {
    const result = await this.accessControlService.listPermissions(tenantUid);
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get('permissions/:uid')
  @ApiOperation({ summary: 'Get permission by UID' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async getPermission(@Param('uid') uid: string, @Query('tenantUid') tenantUid: string) {
    const result = await this.accessControlService.getPermissionByUid(tenantUid, uid);
    return createSuccessResponse(MessageCode.FETCHED, result);
  }

  // ── Role Permissions ──

  @Get('roles/:uid/permissions')
  @ApiOperation({ summary: 'List permissions assigned to a role' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async listRolePermissions(@Param('uid') uid: string, @Query('tenantUid') tenantUid: string) {
    const result = await this.accessControlService.listRolePermissions(tenantUid, uid);
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Post('roles/:uid/permissions')
  @RequirePermission('access-control.create')
  @ApiOperation({ summary: 'Assign permission to a role' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async assignPermission(
    @Param('uid') roleUid: string,
    @Query('tenantUid') tenantUid: string,
    @Body() dto: AssignPermissionDto,
  ) {
    const result = await this.accessControlService.assignPermissionToRole(
      tenantUid,
      roleUid,
      dto.permissionUid,
      dto.conditions,
    );
    return createSuccessResponse(MessageCode.CREATED, result);
  }

  @Delete('roles/:roleUid/permissions/:permissionUid')
  @RequirePermission('access-control.delete')
  @ApiOperation({ summary: 'Revoke permission from a role' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async revokePermission(
    @Param('roleUid') roleUid: string,
    @Param('permissionUid') permissionUid: string,
    @Query('tenantUid') tenantUid: string,
  ) {
    await this.accessControlService.revokePermissionFromRole(tenantUid, roleUid, permissionUid);
    return createSuccessResponse(MessageCode.DELETED);
  }

  // ── App Customer Roles ──

  @Get('customers/:appCustomerUid/roles')
  @ApiOperation({ summary: 'List roles assigned to a customer' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async listCustomerRoles(
    @Param('appCustomerUid') appCustomerUid: string,
    @Query('tenantUid') tenantUid: string,
  ) {
    const result = await this.accessControlService.listCustomerRoles(tenantUid, appCustomerUid);
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Post('customers/:appCustomerUid/roles')
  @RequirePermission('access-control.create')
  @ApiOperation({ summary: 'Assign role to a customer' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async assignRole(
    @Param('appCustomerUid') appCustomerUid: string,
    @Query('tenantUid') tenantUid: string,
    @Body() dto: AssignRoleDto,
  ) {
    const result = await this.accessControlService.assignRoleToCustomer(
      tenantUid,
      appCustomerUid,
      dto.roleUid,
    );
    return createSuccessResponse(MessageCode.CREATED, result);
  }

  @Delete('customers/:appCustomerUid/roles/:roleUid')
  @RequirePermission('access-control.delete')
  @ApiOperation({ summary: 'Revoke role from a customer' })
  @ApiQuery({ name: 'tenantUid', required: true, type: String })
  async revokeRole(
    @Param('appCustomerUid') appCustomerUid: string,
    @Param('roleUid') roleUid: string,
    @Query('tenantUid') tenantUid: string,
  ) {
    await this.accessControlService.revokeRoleFromCustomer(tenantUid, appCustomerUid, roleUid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
