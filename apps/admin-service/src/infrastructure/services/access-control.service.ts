import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION, TenantConnectionManager } from '@cargoez/shared';

interface TenantContext {
  knex: Knex;
  isShared: boolean;
  tenantUid: string;
}

@Injectable()
export class AccessControlService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly adminKnex: Knex,
    @Inject('TENANT_CONNECTION_MANAGER') private readonly tenantConnManager: TenantConnectionManager,
  ) {}

  private async getContext(tenantUid: string): Promise<TenantContext> {
    const tenant = await this.adminKnex('tenants')
      .where('uid', tenantUid)
      .where('is_active', true)
      .first();

    if (!tenant) throw new NotFoundException('Tenant not found');

    const dbConn = {
      host: tenant.db_host || process.env.SHARED_DB_HOST || process.env.DB_HOST || 'localhost',
      port: tenant.db_port || parseInt(process.env.SHARED_DB_PORT || process.env.DB_PORT || '5432', 10),
      name: tenant.db_name || process.env.SHARED_DB_NAME || 'shared_db',
      user: tenant.db_user || process.env.SHARED_DB_USER || process.env.DB_USER || 'postgres',
      password: tenant.db_password || process.env.SHARED_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
      strategy: tenant.db_strategy as 'shared' | 'dedicated',
    };

    const knex = this.tenantConnManager.getConnection(tenantUid, dbConn);
    return { knex, isShared: tenant.db_strategy === 'shared', tenantUid };
  }

  private scopeQuery(query: Knex.QueryBuilder, table: string, ctx: TenantContext): Knex.QueryBuilder {
    if (ctx.isShared) return query.where(`${table}.tenant_uid`, ctx.tenantUid);
    return query;
  }

  // ── Roles ──

  async listRoles(tenantUid: string) {
    const ctx = await this.getContext(tenantUid);
    let q = ctx.knex('roles').where('roles.is_active', true);
    q = this.scopeQuery(q, 'roles', ctx);
    return await q.orderBy('created_at', 'desc');
  }

  async getRoleByUid(tenantUid: string, roleUid: string) {
    const ctx = await this.getContext(tenantUid);
    let q = ctx.knex('roles').where('uid', roleUid);
    q = this.scopeQuery(q, 'roles', ctx);
    const row = await q.first();
    if (!row) throw new NotFoundException('Role not found');
    return row;
  }

  async createRole(tenantUid: string, data: { code: string; name: string; description?: string }) {
    const ctx = await this.getContext(tenantUid);
    const [row] = await ctx.knex('roles')
      .insert({
        ...data,
        tenant_uid: tenantUid,
        is_active: true,
        created_by: 'system',
        modified_by: 'system',
      })
      .returning('*');
    return row;
  }

  async updateRole(tenantUid: string, roleUid: string, data: { name?: string; description?: string }) {
    const ctx = await this.getContext(tenantUid);
    let q = ctx.knex('roles').where('uid', roleUid);
    q = this.scopeQuery(q, 'roles', ctx);
    const [row] = await q.update({ ...data, modified_by: 'system' }).returning('*');
    if (!row) throw new NotFoundException('Role not found');
    return row;
  }

  async deleteRole(tenantUid: string, roleUid: string) {
    const ctx = await this.getContext(tenantUid);
    let q = ctx.knex('roles').where('uid', roleUid);
    q = this.scopeQuery(q, 'roles', ctx);
    const deleted = await q.del();
    if (!deleted) throw new NotFoundException('Role not found');
  }

  // ── Permissions ──

  async listPermissions(tenantUid: string) {
    const ctx = await this.getContext(tenantUid);
    let q = ctx.knex('permissions')
      .join('modules', 'permissions.module_uid', 'modules.uid')
      .join('operations', 'permissions.operation_uid', 'operations.uid')
      .where('permissions.is_active', true)
      .select(
        'permissions.*',
        'modules.code as module_code',
        'modules.name as module_name',
        'operations.code as operation_code',
        'operations.name as operation_name',
      );
    q = this.scopeQuery(q, 'permissions', ctx);
    return await q.orderBy('permissions.permission_key', 'asc');
  }

  async getPermissionByUid(tenantUid: string, permissionUid: string) {
    const ctx = await this.getContext(tenantUid);
    let q = ctx.knex('permissions').where('uid', permissionUid);
    q = this.scopeQuery(q, 'permissions', ctx);
    const row = await q.first();
    if (!row) throw new NotFoundException('Permission not found');
    return row;
  }

  // ── Role Permissions ──

  async listRolePermissions(tenantUid: string, roleUid: string) {
    const ctx = await this.getContext(tenantUid);
    let q = ctx.knex('role_permissions')
      .join('permissions', 'role_permissions.permission_uid', 'permissions.uid')
      .where('role_permissions.role_uid', roleUid)
      .where('role_permissions.is_active', true)
      .select('role_permissions.*', 'permissions.permission_key');
    q = this.scopeQuery(q, 'role_permissions', ctx);
    return await q;
  }

  async assignPermissionToRole(
    tenantUid: string,
    roleUid: string,
    permissionUid: string,
    conditions?: Record<string, any>,
  ) {
    const ctx = await this.getContext(tenantUid);
    const [row] = await ctx.knex('role_permissions')
      .insert({
        role_uid: roleUid,
        permission_uid: permissionUid,
        conditions: conditions ? JSON.stringify(conditions) : null,
        granted_by: 'system',
        tenant_uid: tenantUid,
        is_active: true,
        created_by: 'system',
        modified_by: 'system',
      })
      .returning('*');
    return row;
  }

  async revokePermissionFromRole(tenantUid: string, roleUid: string, permissionUid: string) {
    const ctx = await this.getContext(tenantUid);
    let q = ctx.knex('role_permissions')
      .where('role_uid', roleUid)
      .where('permission_uid', permissionUid);
    q = this.scopeQuery(q, 'role_permissions', ctx);
    const deleted = await q.del();
    if (!deleted) throw new NotFoundException('Role permission not found');
  }

  // ── App Customer Roles ──

  async listCustomerRoles(tenantUid: string, appCustomerUid: string) {
    const ctx = await this.getContext(tenantUid);
    let q = ctx.knex('app_customer_roles')
      .join('roles', 'app_customer_roles.role_uid', 'roles.uid')
      .where('app_customer_roles.app_customer_uid', appCustomerUid)
      .where('app_customer_roles.is_active', true)
      .select(
        'app_customer_roles.*',
        'roles.code as role_code',
        'roles.name as role_name',
      );
    q = this.scopeQuery(q, 'app_customer_roles', ctx);
    return await q;
  }

  async assignRoleToCustomer(tenantUid: string, appCustomerUid: string, roleUid: string) {
    const ctx = await this.getContext(tenantUid);
    const [row] = await ctx.knex('app_customer_roles')
      .insert({
        app_customer_uid: appCustomerUid,
        role_uid: roleUid,
        tenant_uid: tenantUid,
        is_active: true,
        created_by: 'system',
        modified_by: 'system',
      })
      .returning('*');
    return row;
  }

  async revokeRoleFromCustomer(tenantUid: string, appCustomerUid: string, roleUid: string) {
    const ctx = await this.getContext(tenantUid);
    let q = ctx.knex('app_customer_roles')
      .where('app_customer_uid', appCustomerUid)
      .where('role_uid', roleUid);
    q = this.scopeQuery(q, 'app_customer_roles', ctx);
    const deleted = await q.del();
    if (!deleted) throw new NotFoundException('Customer role assignment not found');
  }
}
