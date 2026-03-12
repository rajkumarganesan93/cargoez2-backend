import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { KNEX_CONNECTION } from '@cargoez/shared';
import { Knex } from 'knex';
import { TenantConnectionManager } from '@cargoez/shared';

export interface ResolvedContext {
  tenantUid: string | null;
  branchUid: string | null;
  userType: 'sys_admin' | 'app_customer' | 'branch_customer';
  dbConnection?: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    strategy: 'shared' | 'dedicated';
  };
  permissions: Array<{ key: string; conditions: Record<string, any> | null }>;
}

@Injectable()
export class ResolveContextUseCase {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly adminKnex: Knex,
    @Inject('TENANT_CONNECTION_MANAGER') private readonly tenantConnManager: TenantConnectionManager,
  ) {}

  async execute(keycloakSub: string): Promise<ResolvedContext> {
    // Support lookup by keycloak_sub or email (fallback for Keycloak 26+ where sub may be absent)
    let sysAdmin = await this.adminKnex('sys_admins')
      .where('keycloak_sub', keycloakSub)
      .where('is_active', true)
      .first();

    if (!sysAdmin) {
      sysAdmin = await this.adminKnex('sys_admins')
        .where('email', keycloakSub)
        .where('is_active', true)
        .first();
    }

    if (sysAdmin) {
      const permissions = await this.resolveAdminPermissions(sysAdmin.uid);
      return {
        tenantUid: null,
        branchUid: null,
        userType: 'sys_admin',
        permissions,
      };
    }

    let appCustomer = await this.adminKnex('app_customers')
      .where('keycloak_sub', keycloakSub)
      .where('is_active', true)
      .first();

    if (!appCustomer) {
      appCustomer = await this.adminKnex('app_customers')
        .where('email', keycloakSub)
        .where('is_active', true)
        .first();
    }

    if (!appCustomer) {
      throw new NotFoundException(`No user found for keycloak_sub: ${keycloakSub}`);
    }

    const branch = await this.adminKnex('branches')
      .where('uid', appCustomer.branch_uid)
      .first();

    const tenantUid = appCustomer.tenant_uid || branch?.tenant_uid;

    if (!tenantUid) {
      throw new NotFoundException('No tenant found for user');
    }

    const tenant = await this.adminKnex('tenants')
      .where('uid', tenantUid)
      .where('is_active', true)
      .first();

    if (!tenant) {
      throw new NotFoundException('Tenant not found or inactive');
    }

    const dbConnection = {
      host: tenant.db_host || process.env.SHARED_DB_HOST || process.env.DB_HOST || 'localhost',
      port: tenant.db_port || parseInt(process.env.SHARED_DB_PORT || process.env.DB_PORT || '5432', 10),
      name: tenant.db_name || process.env.SHARED_DB_NAME || 'shared_db',
      user: tenant.db_user || process.env.SHARED_DB_USER || process.env.DB_USER || 'postgres',
      password: tenant.db_password || process.env.SHARED_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
      strategy: tenant.db_strategy as 'shared' | 'dedicated',
    };

    const tenantKnex = this.tenantConnManager.getConnection(tenantUid, dbConnection);

    const permissions = await this.resolvePermissions(tenantKnex, appCustomer.uid, tenantUid, tenant.db_strategy);

    return {
      tenantUid,
      branchUid: appCustomer.branch_uid || branch?.uid || null,
      userType: 'app_customer',
      dbConnection,
      permissions,
    };
  }

  private async resolveAdminPermissions(
    sysAdminUid: string,
  ): Promise<Array<{ key: string; conditions: Record<string, any> | null }>> {
    try {
      const rows = await this.adminKnex('sys_admin_roles as sar')
        .join('admin_role_permissions as arp', 'arp.admin_role_uid', 'sar.admin_role_uid')
        .join('admin_permissions as ap', 'ap.uid', 'arp.admin_permission_uid')
        .where('sar.sys_admin_uid', sysAdminUid)
        .where('sar.is_active', true)
        .where('arp.is_active', true)
        .where('ap.is_active', true)
        .select('ap.permission_key', 'arp.conditions');

      const permMap = new Map<string, Record<string, any> | null>();
      for (const row of rows) {
        if (!permMap.has(row.permission_key)) {
          permMap.set(row.permission_key, row.conditions);
        }
      }

      return Array.from(permMap.entries()).map(([key, conditions]) => ({ key, conditions }));
    } catch (error) {
      console.error('Failed to resolve admin permissions:', error);
      return [{ key: '*', conditions: null }];
    }
  }

  private async resolvePermissions(
    tenantKnex: Knex,
    appCustomerUid: string,
    tenantUid: string,
    dbStrategy: string,
  ): Promise<Array<{ key: string; conditions: Record<string, any> | null }>> {
    try {
      let query = tenantKnex('app_customer_roles as acr')
        .join('role_permissions as rp', 'rp.role_uid', 'acr.role_uid')
        .join('permissions as p', 'p.uid', 'rp.permission_uid')
        .where('acr.app_customer_uid', appCustomerUid)
        .where('acr.is_active', true)
        .where('rp.is_active', true)
        .where('p.is_active', true)
        .select('p.permission_key', 'rp.conditions');

      if (dbStrategy === 'shared') {
        query = query
          .where('acr.tenant_uid', tenantUid)
          .where('rp.tenant_uid', tenantUid)
          .where('p.tenant_uid', tenantUid);
      }

      const rows = await query;

      const permMap = new Map<string, Record<string, any> | null>();
      for (const row of rows) {
        if (!permMap.has(row.permission_key)) {
          permMap.set(row.permission_key, row.conditions);
        }
      }

      return Array.from(permMap.entries()).map(([key, conditions]) => ({ key, conditions }));
    } catch (error) {
      console.error('Failed to resolve permissions from tenant DB:', error);
      return [];
    }
  }
}
