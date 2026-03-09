import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex('roles').insert([
    { name: 'super-admin', description: 'Full system access with no restrictions', is_system: true },
    { name: 'admin', description: 'Full CRUD on all modules with tenant isolation', is_system: true },
    { name: 'manager', description: 'Read and update on all modules with tenant isolation', is_system: true },
    { name: 'user', description: 'Read on assigned modules, ownership-based updates', is_system: true },
    { name: 'viewer', description: 'Read-only access on all modules with tenant isolation', is_system: true },
  ]);

  const roles = await knex('roles').select('*');
  const roleMap = Object.fromEntries(roles.map((r: any) => [r.name, r.id]));

  const operations = await knex('operations').insert([
    { code: 'read', name: 'Read', description: 'View records' },
    { code: 'create', name: 'Create', description: 'Create new records' },
    { code: 'update', name: 'Update', description: 'Modify existing records' },
    { code: 'delete', name: 'Delete', description: 'Remove records' },
    { code: 'export', name: 'Export', description: 'Export data' },
    { code: 'import', name: 'Import', description: 'Import data' },
    { code: 'approve', name: 'Approve', description: 'Approve records' },
    { code: 'reject', name: 'Reject', description: 'Reject records' },
  ]).returning('*');
  const opMap = Object.fromEntries(operations.map((o: any) => [o.code, o.id]));

  const modulesData = [
    { code: 'user-management', name: 'User Management', description: 'Manage users, roles, and permissions', icon: 'users', sort_order: 1 },
    { code: 'contacts', name: 'Contacts', description: 'Contact management', icon: 'contact', sort_order: 2 },
    { code: 'freight', name: 'Freight', description: 'Freight and shipment management', icon: 'truck', sort_order: 3 },
    { code: 'books', name: 'Books', description: 'Book management', icon: 'book', sort_order: 4 },
    { code: 'settings', name: 'Settings', description: 'System settings and configuration', icon: 'settings', sort_order: 5 },
  ];
  const modules = await knex('modules').insert(modulesData).returning('*');
  const modMap = Object.fromEntries(modules.map((m: any) => [m.code, m.id]));

  const screensData = [
    { module_id: modMap['user-management'], code: 'users', name: 'Users', sort_order: 1 },
    { module_id: modMap['user-management'], code: 'roles', name: 'Roles', sort_order: 2 },
    { module_id: modMap['user-management'], code: 'permissions', name: 'Permissions', sort_order: 3 },
    { module_id: modMap['contacts'], code: 'contact-list', name: 'Contact List', sort_order: 1 },
    { module_id: modMap['contacts'], code: 'contact-detail', name: 'Contact Detail', sort_order: 2 },
    { module_id: modMap['freight'], code: 'shipment-list', name: 'Shipment List', sort_order: 1 },
    { module_id: modMap['freight'], code: 'shipment-detail', name: 'Shipment Detail', sort_order: 2 },
    { module_id: modMap['books'], code: 'book-list', name: 'Book List', sort_order: 1 },
    { module_id: modMap['books'], code: 'book-detail', name: 'Book Detail', sort_order: 2 },
    { module_id: modMap['settings'], code: 'general', name: 'General', sort_order: 1 },
    { module_id: modMap['settings'], code: 'integrations', name: 'Integrations', sort_order: 2 },
  ];
  const screens = await knex('screens').insert(screensData).returning('*');

  const crudOps = ['read', 'create', 'update', 'delete'];

  const permissionsToInsert: any[] = [];
  for (const mod of modules) {
    const modScreens = screens.filter((s: any) => s.module_id === mod.id);
    for (const screen of modScreens) {
      for (const opCode of crudOps) {
        permissionsToInsert.push({
          module_id: mod.id,
          screen_id: screen.id,
          operation_id: opMap[opCode],
          permission_key: `${mod.code}.${screen.code}.${opCode}`,
        });
      }
    }
  }
  const permissions = await knex('permissions').insert(permissionsToInsert).returning('*');

  const rolePermissionsToInsert: any[] = [];

  for (const perm of permissions) {
    rolePermissionsToInsert.push({
      role_id: roleMap['super-admin'],
      permission_id: perm.id,
      conditions: null,
    });
  }

  for (const perm of permissions) {
    rolePermissionsToInsert.push({
      role_id: roleMap['admin'],
      permission_id: perm.id,
      conditions: JSON.stringify({ tenant_isolation: true }),
    });
  }

  for (const perm of permissions) {
    const op = perm.permission_key.split('.')[2];
    if (['read', 'update'].includes(op)) {
      rolePermissionsToInsert.push({
        role_id: roleMap['manager'],
        permission_id: perm.id,
        conditions: JSON.stringify({ tenant_isolation: true }),
      });
    }
  }

  for (const perm of permissions) {
    const op = perm.permission_key.split('.')[2];
    if (op === 'read') {
      rolePermissionsToInsert.push({
        role_id: roleMap['user'],
        permission_id: perm.id,
        conditions: JSON.stringify({ tenant_isolation: true }),
      });
    } else if (op === 'update') {
      rolePermissionsToInsert.push({
        role_id: roleMap['user'],
        permission_id: perm.id,
        conditions: JSON.stringify({ tenant_isolation: true, ownership_only: true }),
      });
    }
  }

  for (const perm of permissions) {
    const op = perm.permission_key.split('.')[2];
    if (op === 'read') {
      rolePermissionsToInsert.push({
        role_id: roleMap['viewer'],
        permission_id: perm.id,
        conditions: JSON.stringify({ tenant_isolation: true }),
      });
    }
  }

  await knex('role_permissions').insert(rolePermissionsToInsert);
}

export async function down(knex: Knex): Promise<void> {
  await knex('role_permissions').del();
  await knex('permissions').del();
  await knex('screens').del();
  await knex('modules').del();
  await knex('operations').del();
  await knex('roles').del();
}
