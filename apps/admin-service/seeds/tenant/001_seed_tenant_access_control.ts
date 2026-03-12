import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  const tenantUid = process.env.SEED_TENANT_UID || null;
  const appCustomerUid = process.env.SEED_APP_CUSTOMER_UID || null;

  await knex.raw('TRUNCATE app_customer_roles, role_permissions, permissions, roles, operations, modules CASCADE');

  const moduleData = [
    { code: 'users', name: 'Users', description: 'User management', icon: 'users', sort_order: 1 },
    { code: 'roles', name: 'Roles', description: 'Role management', icon: 'shield', sort_order: 2 },
    { code: 'permissions', name: 'Permissions', description: 'Permission management', icon: 'lock', sort_order: 3 },
    { code: 'freight', name: 'Freight', description: 'Freight operations', icon: 'truck', sort_order: 4 },
    { code: 'contacts', name: 'Contacts', description: 'Contact management', icon: 'address-book', sort_order: 5 },
    { code: 'books', name: 'Books', description: 'Books/accounting', icon: 'book', sort_order: 6 },
    { code: 'branches', name: 'Branches', description: 'Branch management', icon: 'building', sort_order: 7 },
    { code: 'dashboard', name: 'Dashboard', description: 'Dashboard', icon: 'chart', sort_order: 8 },
  ];

  const modules = await knex('modules')
    .insert(moduleData.map((m) => ({ ...m, tenant_uid: tenantUid, is_active: true })))
    .returning('*');

  const operationData = [
    { code: 'create', name: 'Create', description: 'Create new records' },
    { code: 'read', name: 'Read', description: 'View records' },
    { code: 'update', name: 'Update', description: 'Modify existing records' },
    { code: 'delete', name: 'Delete', description: 'Remove records' },
  ];

  const operations = await knex('operations')
    .insert(operationData.map((o) => ({ ...o, tenant_uid: tenantUid, is_active: true })))
    .returning('*');

  const permissionInserts: any[] = [];
  for (const mod of modules) {
    for (const op of operations) {
      permissionInserts.push({
        module_uid: mod.uid,
        operation_uid: op.uid,
        permission_key: `${mod.code}.${op.code}`,
        tenant_uid: tenantUid,
        is_active: true,
      });
    }
  }

  const permissions = await knex('permissions').insert(permissionInserts).returning('*');

  const roleData = [
    { code: 'tenant_admin', name: 'Tenant Admin', description: 'Full access to all tenant resources', is_system: true },
    { code: 'manager', name: 'Manager', description: 'Read and update access', is_system: true },
    { code: 'operator', name: 'Operator', description: 'Read-only access', is_system: true },
  ];

  const roles = await knex('roles')
    .insert(roleData.map((r) => ({ ...r, tenant_uid: tenantUid, is_active: true })))
    .returning('*');

  const tenantAdminRole = roles.find((r) => r.code === 'tenant_admin')!;
  const managerRole = roles.find((r) => r.code === 'manager')!;
  const operatorRole = roles.find((r) => r.code === 'operator')!;

  const readOp = operations.find((o) => o.code === 'read')!;
  const updateOp = operations.find((o) => o.code === 'update')!;

  const rolePermInserts: any[] = [];

  for (const perm of permissions) {
    rolePermInserts.push({
      role_uid: tenantAdminRole.uid,
      permission_uid: perm.uid,
      conditions: null,
      granted_by: 'system',
      tenant_uid: tenantUid,
      is_active: true,
    });
  }

  for (const perm of permissions) {
    if (perm.operation_uid === readOp.uid || perm.operation_uid === updateOp.uid) {
      rolePermInserts.push({
        role_uid: managerRole.uid,
        permission_uid: perm.uid,
        conditions: null,
        granted_by: 'system',
        tenant_uid: tenantUid,
        is_active: true,
      });
    }
  }

  for (const perm of permissions) {
    if (perm.operation_uid === readOp.uid) {
      rolePermInserts.push({
        role_uid: operatorRole.uid,
        permission_uid: perm.uid,
        conditions: null,
        granted_by: 'system',
        tenant_uid: tenantUid,
        is_active: true,
      });
    }
  }

  await knex('role_permissions').insert(rolePermInserts);

  if (appCustomerUid) {
    await knex('app_customer_roles').insert({
      app_customer_uid: appCustomerUid,
      role_uid: tenantAdminRole.uid,
      tenant_uid: tenantUid,
      is_active: true,
    });
  }
}
