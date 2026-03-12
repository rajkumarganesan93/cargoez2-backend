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
import {
  AdminRoleRepository,
  AdminPermissionRepository,
  AdminRolePermissionRepository,
  SysAdminRoleRepository,
} from '../../infrastructure/repositories/admin-access-control.repository';
import {
  CreateAdminRoleDto,
  UpdateAdminRoleDto,
  AssignAdminRolePermissionDto,
  AssignSysAdminRoleDto,
} from '../dto/admin-access-control.dto';

@ApiTags('Admin Access Control')
@ApiBearerAuth()
@Controller('admin-access-control')
export class AdminAccessControlController {
  constructor(
    private readonly adminRoleRepo: AdminRoleRepository,
    private readonly adminPermRepo: AdminPermissionRepository,
    private readonly adminRolePermRepo: AdminRolePermissionRepository,
    private readonly sysAdminRoleRepo: SysAdminRoleRepository,
  ) {}

  // --- Admin Roles ---
  @Get('roles')
  @RequirePermission('admin-access-control.read')
  @ApiOperation({ summary: 'List admin roles' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listRoles(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const result = await this.adminRoleRepo.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      searchFields: ['code', 'name'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get('roles/:uid')
  @RequirePermission('admin-access-control.read')
  @ApiOperation({ summary: 'Get admin role by UID' })
  async getRole(@Param('uid') uid: string) {
    const entity = await this.adminRoleRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Admin role not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post('roles')
  @RequirePermission('admin-access-control.create')
  @ApiOperation({ summary: 'Create admin role' })
  async createRole(@Body() dto: CreateAdminRoleDto) {
    const entity = await this.adminRoleRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put('roles/:uid')
  @RequirePermission('admin-access-control.update')
  @ApiOperation({ summary: 'Update admin role' })
  async updateRole(@Param('uid') uid: string, @Body() dto: UpdateAdminRoleDto) {
    const entity = await this.adminRoleRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete('roles/:uid')
  @RequirePermission('admin-access-control.delete')
  @ApiOperation({ summary: 'Delete admin role' })
  async deleteRole(@Param('uid') uid: string) {
    await this.adminRoleRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }

  // --- Admin Permissions ---
  @Get('permissions')
  @RequirePermission('admin-access-control.read')
  @ApiOperation({ summary: 'List admin permissions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listPermissions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const result = await this.adminPermRepo.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      searchFields: ['permission_key'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  // --- Admin Role Permissions ---
  @Get('role-permissions/:roleUid')
  @RequirePermission('admin-access-control.read')
  @ApiOperation({ summary: 'List permissions for admin role' })
  async listRolePermissions(@Param('roleUid') roleUid: string) {
    const result = await this.adminRolePermRepo.findByRoleUid(roleUid);
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Post('role-permissions')
  @RequirePermission('admin-access-control.create')
  @ApiOperation({ summary: 'Assign permission to admin role' })
  async assignRolePermission(@Body() dto: AssignAdminRolePermissionDto) {
    const entity = await this.adminRolePermRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Delete('role-permissions/:uid')
  @RequirePermission('admin-access-control.delete')
  @ApiOperation({ summary: 'Revoke permission from admin role' })
  async revokeRolePermission(@Param('uid') uid: string) {
    await this.adminRolePermRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }

  // --- Sys Admin Roles ---
  @Get('sys-admin-roles/:sysAdminUid')
  @RequirePermission('admin-access-control.read')
  @ApiOperation({ summary: 'List roles for sys admin' })
  async listSysAdminRoles(@Param('sysAdminUid') sysAdminUid: string) {
    const result = await this.sysAdminRoleRepo.findBySysAdminUid(sysAdminUid);
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Post('sys-admin-roles')
  @RequirePermission('admin-access-control.create')
  @ApiOperation({ summary: 'Assign role to sys admin' })
  async assignSysAdminRole(@Body() dto: AssignSysAdminRoleDto) {
    const entity = await this.sysAdminRoleRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Delete('sys-admin-roles/:uid')
  @RequirePermission('admin-access-control.delete')
  @ApiOperation({ summary: 'Remove role from sys admin' })
  async removeSysAdminRole(@Param('uid') uid: string) {
    await this.sysAdminRoleRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
