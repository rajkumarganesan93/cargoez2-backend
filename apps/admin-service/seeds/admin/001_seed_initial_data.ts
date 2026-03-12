import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw(`
    TRUNCATE TABLE
      sys_admin_roles, admin_role_permissions, admin_permissions, admin_roles,
      app_customer_credentials, app_customers,
      branches, tenants,
      sys_admins,
      meta_data_details, meta_data,
      modules, operations
    CASCADE
  `);

  // --- meta_data categories ---
  const [country] = await knex('meta_data').insert({ code: 'country', name: 'Country' }).returning('uid');
  const [tenantType] = await knex('meta_data').insert({ code: 'tenant_type', name: 'Tenant Type' }).returning('uid');
  const [currency] = await knex('meta_data').insert({ code: 'currency', name: 'Currency' }).returning('uid');
  const [status] = await knex('meta_data').insert({ code: 'status', name: 'Status' }).returning('uid');

  // --- meta_data_details ---
  const [countryIN] = await knex('meta_data_details')
    .insert({ meta_data_uid: country.uid, code: 'IN', name: 'India', sort_order: 1 })
    .returning('uid');
  await knex('meta_data_details').insert([
    { meta_data_uid: country.uid, code: 'US', name: 'United States', sort_order: 2 },
    { meta_data_uid: country.uid, code: 'UK', name: 'United Kingdom', sort_order: 3 },
    { meta_data_uid: country.uid, code: 'SG', name: 'Singapore', sort_order: 4 },
  ]);

  const [tenantTypeNormal] = await knex('meta_data_details')
    .insert({ meta_data_uid: tenantType.uid, code: 'normal', name: 'Normal', sort_order: 1 })
    .returning('uid');
  await knex('meta_data_details').insert({
    meta_data_uid: tenantType.uid, code: 'enterprise', name: 'Enterprise', sort_order: 2,
  });

  await knex('meta_data_details').insert([
    { meta_data_uid: currency.uid, code: 'INR', name: 'Indian Rupee', sort_order: 1 },
    { meta_data_uid: currency.uid, code: 'USD', name: 'US Dollar', sort_order: 2 },
    { meta_data_uid: currency.uid, code: 'GBP', name: 'British Pound', sort_order: 3 },
  ]);

  await knex('meta_data_details').insert([
    { meta_data_uid: status.uid, code: 'active', name: 'Active', sort_order: 1 },
    { meta_data_uid: status.uid, code: 'inactive', name: 'Inactive', sort_order: 2 },
    { meta_data_uid: status.uid, code: 'pending', name: 'Pending', sort_order: 3 },
  ]);

  // --- Master catalog: modules (admin-level modules for admin_db) ---
  const adminModules = await knex('modules').insert([
    { code: 'tenants', name: 'Tenants', sort_order: 1 },
    { code: 'branches', name: 'Branches', sort_order: 2 },
    { code: 'app-customers', name: 'App Customers', sort_order: 3 },
    { code: 'branch-customers', name: 'Branch Customers', sort_order: 4 },
    { code: 'sys-admins', name: 'Sys Admins', sort_order: 5 },
    { code: 'metadata', name: 'Metadata', sort_order: 6 },
    { code: 'products', name: 'Products', sort_order: 7 },
    { code: 'subscriptions', name: 'Subscriptions', sort_order: 8 },
    { code: 'master-catalog', name: 'Master Catalog', sort_order: 9 },
    { code: 'admin-access-control', name: 'Admin Access Control', sort_order: 10 },
  ]).returning('*');

  // --- Master catalog: operations ---
  const adminOperations = await knex('operations').insert([
    { code: 'create', name: 'Create' },
    { code: 'read', name: 'Read' },
    { code: 'update', name: 'Update' },
    { code: 'delete', name: 'Delete' },
  ]).returning('*');

  // --- Admin permissions (module x operation) ---
  const adminPermInserts: any[] = [];
  for (const mod of adminModules) {
    for (const op of adminOperations) {
      adminPermInserts.push({
        module_uid: mod.uid,
        operation_uid: op.uid,
        permission_key: `${mod.code}.${op.code}`,
      });
    }
  }
  const adminPermissions = await knex('admin_permissions').insert(adminPermInserts).returning('*');

  // --- Admin roles ---
  const adminRoles = await knex('admin_roles').insert([
    { code: 'super_admin', name: 'Super Admin', description: 'Full access to all admin resources', is_system: true },
    { code: 'support_agent', name: 'Support Agent', description: 'Read-only access to admin resources', is_system: true },
    { code: 'operations_manager', name: 'Operations Manager', description: 'Read+update access to tenants, branches, metadata, subscriptions', is_system: true },
  ]).returning('*');

  const superAdminRole = adminRoles.find((r: any) => r.code === 'super_admin')!;
  const supportAgentRole = adminRoles.find((r: any) => r.code === 'support_agent')!;
  const opsManagerRole = adminRoles.find((r: any) => r.code === 'operations_manager')!;

  const readOp = adminOperations.find((o: any) => o.code === 'read')!;
  const updateOp = adminOperations.find((o: any) => o.code === 'update')!;

  const opsManagerModules = ['tenants', 'branches', 'metadata', 'subscriptions', 'app-customers', 'branch-customers'];

  const rolePermInserts: any[] = [];

  // super_admin -> all permissions
  for (const perm of adminPermissions) {
    rolePermInserts.push({
      admin_role_uid: superAdminRole.uid,
      admin_permission_uid: perm.uid,
      granted_by: 'system',
    });
  }

  // support_agent -> read only
  for (const perm of adminPermissions) {
    if (perm.operation_uid === readOp.uid) {
      rolePermInserts.push({
        admin_role_uid: supportAgentRole.uid,
        admin_permission_uid: perm.uid,
        granted_by: 'system',
      });
    }
  }

  // operations_manager -> read+update on selected modules
  for (const perm of adminPermissions) {
    const mod = adminModules.find((m: any) => m.uid === perm.module_uid);
    if (mod && opsManagerModules.includes(mod.code)) {
      if (perm.operation_uid === readOp.uid || perm.operation_uid === updateOp.uid) {
        rolePermInserts.push({
          admin_role_uid: opsManagerRole.uid,
          admin_permission_uid: perm.uid,
          granted_by: 'system',
        });
      }
    }
  }

  await knex('admin_role_permissions').insert(rolePermInserts);

  // --- Sys Admins ---
  const sysAdmins = await knex('sys_admins').insert([
    { first_name: 'Admin', last_name: 'User', email: 'admin@cargoez.com', keycloak_sub: null },
    { first_name: 'Support', last_name: 'Agent', email: 'support@cargoez.com', keycloak_sub: null },
    { first_name: 'Operations', last_name: 'Manager', email: 'ops@cargoez.com', keycloak_sub: null },
  ]).returning('*');

  const sysAdminUser = sysAdmins.find((s: any) => s.email === 'admin@cargoez.com')!;
  const supportUser = sysAdmins.find((s: any) => s.email === 'support@cargoez.com')!;
  const opsUser = sysAdmins.find((s: any) => s.email === 'ops@cargoez.com')!;

  // Assign roles to sys_admins
  await knex('sys_admin_roles').insert([
    { sys_admin_uid: sysAdminUser.uid, admin_role_uid: superAdminRole.uid },
    { sys_admin_uid: supportUser.uid, admin_role_uid: supportAgentRole.uid },
    { sys_admin_uid: opsUser.uid, admin_role_uid: opsManagerRole.uid },
  ]);

  // --- Demo tenant ---
  const [demoTenant] = await knex('tenants')
    .insert({
      code: 'demo',
      name: 'Demo Tenant',
      tenant_type_uid: tenantTypeNormal.uid,
      country_uid: countryIN.uid,
      db_strategy: 'shared',
    })
    .returning('uid');

  // --- Demo branch ---
  const [demoBranch] = await knex('branches')
    .insert({
      tenant_uid: demoTenant.uid,
      code: 'hq',
      name: 'Head Office',
      country_uid: countryIN.uid,
    })
    .returning('uid');

  // --- Demo app_customers ---
  await knex('app_customers').insert([
    {
      tenant_uid: demoTenant.uid,
      branch_uid: demoBranch.uid,
      first_name: 'Manager',
      last_name: 'User',
      email: 'manager@demo.cargoez.com',
      keycloak_sub: null,
    },
    {
      tenant_uid: demoTenant.uid,
      branch_uid: demoBranch.uid,
      first_name: 'Viewer',
      last_name: 'User',
      email: 'viewer@demo.cargoez.com',
      keycloak_sub: null,
    },
  ]);

  console.log('Admin DB seeded successfully');
  console.log(`Demo Tenant UID: ${demoTenant.uid}`);
  console.log(`Demo Branch UID: ${demoBranch.uid}`);
  console.log('SysAdmins: admin@cargoez.com (super_admin), support@cargoez.com (support_agent), ops@cargoez.com (operations_manager)');
  console.log('AppCustomers: manager@demo.cargoez.com, viewer@demo.cargoez.com');
}
