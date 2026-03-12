const http = require('http');
const Knex = require('knex');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Rajkumar17#',
};

const KC_URL = 'http://localhost:8080';
const REALM = 'cargoez';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

const ENTERPRISE_TENANT = {
  code: 'globalfreight',
  name: 'Global Freight Corp',
  dbName: 'globalfreight_db',
};

// ── Keycloak helpers ──

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAdminToken() {
  const body = `grant_type=password&client_id=admin-cli&username=${ADMIN_USER}&password=${ADMIN_PASS}`;
  const res = await httpRequest(`${KC_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, body);
  return JSON.parse(res.body).access_token;
}

async function ensureKeycloakUser(token, user) {
  const existing = await httpRequest(
    `${KC_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(user.email)}&exact=true`,
    { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
  );
  const users = JSON.parse(existing.body);
  if (users.length > 0) {
    console.log(`  KC user ${user.email} already exists: ${users[0].id}`);
    return users[0].id;
  }

  const payload = JSON.stringify({
    username: user.email,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    enabled: true,
    emailVerified: true,
    credentials: [{ type: 'password', value: user.password, temporary: false }],
    attributes: { tenant_id: [user.tenantId || ''], user_type: ['app_customer'] },
  });

  const res = await httpRequest(`${KC_URL}/admin/realms/${REALM}/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }, payload);

  if (res.status === 201) {
    const id = res.headers.location.split('/').pop();
    console.log(`  KC user ${user.email} created: ${id}`);
    return id;
  }
  console.error(`  Failed to create KC user ${user.email}: ${res.status} ${res.body}`);
  return null;
}

async function getKeycloakSub(token, email) {
  const res = await httpRequest(
    `${KC_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(email)}&exact=true`,
    { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
  );
  const users = JSON.parse(res.body);
  return users.length > 0 ? users[0].id : null;
}

// ── Main ──

async function run() {
  console.log('=== Setting up Enterprise Tenant: Global Freight Corp ===\n');

  // ── Step 1: Create the dedicated database ──
  console.log('Step 1: Creating dedicated database...');
  const pgAdmin = Knex({ client: 'pg', connection: { ...DB_CONFIG, database: 'postgres' } });

  try {
    const dbExists = await pgAdmin.raw(
      `SELECT 1 FROM pg_database WHERE datname = '${ENTERPRISE_TENANT.dbName}'`,
    );
    if (dbExists.rows.length === 0) {
      await pgAdmin.raw(`CREATE DATABASE "${ENTERPRISE_TENANT.dbName}"`);
      console.log(`  Created database: ${ENTERPRISE_TENANT.dbName}`);
    } else {
      console.log(`  Database ${ENTERPRISE_TENANT.dbName} already exists`);
    }
  } finally {
    await pgAdmin.destroy();
  }

  // ── Step 2: Run migrations (create tables) ──
  console.log('\nStep 2: Creating tables in dedicated database...');
  const enterpriseDb = Knex({ client: 'pg', connection: { ...DB_CONFIG, database: ENTERPRISE_TENANT.dbName } });

  try {
    // Access control tables (from tenant migration 001)
    const hasModules = await enterpriseDb.schema.hasTable('modules');
    if (!hasModules) {
      await enterpriseDb.schema.createTable('modules', (table) => {
        table.uuid('uid').primary().defaultTo(enterpriseDb.fn.uuid());
        table.uuid('tenant_uid').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('created_by').nullable();
        table.string('modified_by').nullable();
        table.timestamp('created_at').defaultTo(enterpriseDb.fn.now());
        table.timestamp('modified_at').defaultTo(enterpriseDb.fn.now());
        table.string('code').notNullable();
        table.string('name').notNullable();
        table.string('description').nullable();
        table.string('icon').nullable();
        table.integer('sort_order').defaultTo(0);
        table.unique(['tenant_uid', 'code']);
      });

      await enterpriseDb.schema.createTable('operations', (table) => {
        table.uuid('uid').primary().defaultTo(enterpriseDb.fn.uuid());
        table.uuid('tenant_uid').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('created_by').nullable();
        table.string('modified_by').nullable();
        table.timestamp('created_at').defaultTo(enterpriseDb.fn.now());
        table.timestamp('modified_at').defaultTo(enterpriseDb.fn.now());
        table.string('code').notNullable();
        table.string('name').notNullable();
        table.string('description').nullable();
        table.unique(['tenant_uid', 'code']);
      });

      await enterpriseDb.schema.createTable('roles', (table) => {
        table.uuid('uid').primary().defaultTo(enterpriseDb.fn.uuid());
        table.uuid('tenant_uid').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('created_by').nullable();
        table.string('modified_by').nullable();
        table.timestamp('created_at').defaultTo(enterpriseDb.fn.now());
        table.timestamp('modified_at').defaultTo(enterpriseDb.fn.now());
        table.string('code').notNullable();
        table.string('name').notNullable();
        table.string('description').nullable();
        table.boolean('is_system').defaultTo(false);
        table.unique(['tenant_uid', 'code']);
      });

      await enterpriseDb.schema.createTable('permissions', (table) => {
        table.uuid('uid').primary().defaultTo(enterpriseDb.fn.uuid());
        table.uuid('tenant_uid').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('created_by').nullable();
        table.string('modified_by').nullable();
        table.timestamp('created_at').defaultTo(enterpriseDb.fn.now());
        table.timestamp('modified_at').defaultTo(enterpriseDb.fn.now());
        table.uuid('module_uid').references('uid').inTable('modules').onDelete('CASCADE');
        table.uuid('operation_uid').references('uid').inTable('operations').onDelete('CASCADE');
        table.string('permission_key').notNullable();
        table.unique(['tenant_uid', 'module_uid', 'operation_uid']);
      });

      await enterpriseDb.schema.createTable('role_permissions', (table) => {
        table.uuid('uid').primary().defaultTo(enterpriseDb.fn.uuid());
        table.uuid('tenant_uid').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('created_by').nullable();
        table.string('modified_by').nullable();
        table.timestamp('created_at').defaultTo(enterpriseDb.fn.now());
        table.timestamp('modified_at').defaultTo(enterpriseDb.fn.now());
        table.uuid('role_uid').references('uid').inTable('roles').onDelete('CASCADE');
        table.uuid('permission_uid').references('uid').inTable('permissions').onDelete('CASCADE');
        table.jsonb('conditions').nullable();
        table.string('granted_by').nullable();
        table.unique(['role_uid', 'permission_uid']);
      });

      await enterpriseDb.schema.createTable('app_customer_roles', (table) => {
        table.uuid('uid').primary().defaultTo(enterpriseDb.fn.uuid());
        table.uuid('tenant_uid').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('created_by').nullable();
        table.string('modified_by').nullable();
        table.timestamp('created_at').defaultTo(enterpriseDb.fn.now());
        table.timestamp('modified_at').defaultTo(enterpriseDb.fn.now());
        table.uuid('app_customer_uid').notNullable();
        table.uuid('role_uid').references('uid').inTable('roles').onDelete('CASCADE');
        table.unique(['app_customer_uid', 'role_uid']);
      });

      console.log('  Access control tables created');
    } else {
      console.log('  Access control tables already exist');
    }

    // Business tables (from tenant migration 002)
    const hasShipments = await enterpriseDb.schema.hasTable('shipments');
    if (!hasShipments) {
      await enterpriseDb.schema.createTable('shipments', (table) => {
        table.uuid('uid').primary().defaultTo(enterpriseDb.fn.uuid());
        table.uuid('tenant_uid').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('created_by').nullable();
        table.string('modified_by').nullable();
        table.timestamp('created_at').defaultTo(enterpriseDb.fn.now());
        table.timestamp('modified_at').defaultTo(enterpriseDb.fn.now());
        table.string('shipment_number').notNullable();
        table.string('origin').notNullable();
        table.string('destination').notNullable();
        table.string('mode').notNullable().defaultTo('air');
        table.string('status').notNullable().defaultTo('draft');
        table.string('shipper_name').nullable();
        table.string('consignee_name').nullable();
        table.decimal('weight', 12, 3).nullable();
        table.string('weight_unit').defaultTo('kg');
        table.integer('pieces').nullable();
        table.date('etd').nullable();
        table.date('eta').nullable();
        table.text('remarks').nullable();
        table.unique(['tenant_uid', 'shipment_number']);
      });

      await enterpriseDb.schema.createTable('contacts', (table) => {
        table.uuid('uid').primary().defaultTo(enterpriseDb.fn.uuid());
        table.uuid('tenant_uid').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('created_by').nullable();
        table.string('modified_by').nullable();
        table.timestamp('created_at').defaultTo(enterpriseDb.fn.now());
        table.timestamp('modified_at').defaultTo(enterpriseDb.fn.now());
        table.string('contact_type').notNullable().defaultTo('company');
        table.string('company_name').nullable();
        table.string('first_name').nullable();
        table.string('last_name').nullable();
        table.string('email').nullable();
        table.string('phone').nullable();
        table.string('mobile').nullable();
        table.string('address_line1').nullable();
        table.string('address_line2').nullable();
        table.string('city').nullable();
        table.string('state').nullable();
        table.string('country').nullable();
        table.string('postal_code').nullable();
        table.string('tax_id').nullable();
        table.text('notes').nullable();
      });

      await enterpriseDb.schema.createTable('invoices', (table) => {
        table.uuid('uid').primary().defaultTo(enterpriseDb.fn.uuid());
        table.uuid('tenant_uid').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('created_by').nullable();
        table.string('modified_by').nullable();
        table.timestamp('created_at').defaultTo(enterpriseDb.fn.now());
        table.timestamp('modified_at').defaultTo(enterpriseDb.fn.now());
        table.string('invoice_number').notNullable();
        table.uuid('contact_uid').nullable().references('uid').inTable('contacts').onDelete('SET NULL');
        table.uuid('shipment_uid').nullable().references('uid').inTable('shipments').onDelete('SET NULL');
        table.date('invoice_date').notNullable();
        table.date('due_date').nullable();
        table.string('currency').defaultTo('USD');
        table.decimal('subtotal', 14, 2).defaultTo(0);
        table.decimal('tax_amount', 14, 2).defaultTo(0);
        table.decimal('total_amount', 14, 2).defaultTo(0);
        table.string('status').notNullable().defaultTo('draft');
        table.text('notes').nullable();
        table.unique(['tenant_uid', 'invoice_number']);
      });

      await enterpriseDb.schema.createTable('invoice_items', (table) => {
        table.uuid('uid').primary().defaultTo(enterpriseDb.fn.uuid());
        table.uuid('tenant_uid').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.string('created_by').nullable();
        table.string('modified_by').nullable();
        table.timestamp('created_at').defaultTo(enterpriseDb.fn.now());
        table.timestamp('modified_at').defaultTo(enterpriseDb.fn.now());
        table.uuid('invoice_uid').references('uid').inTable('invoices').onDelete('CASCADE');
        table.string('description').notNullable();
        table.decimal('quantity', 10, 3).defaultTo(1);
        table.decimal('unit_price', 14, 2).defaultTo(0);
        table.decimal('amount', 14, 2).defaultTo(0);
        table.integer('sort_order').defaultTo(0);
      });

      console.log('  Business tables created');
    } else {
      console.log('  Business tables already exist');
    }

    // ── Step 3: Create tenant in admin_db ──
    console.log('\nStep 3: Creating enterprise tenant in admin_db...');
    const adminDb = Knex({ client: 'pg', connection: { ...DB_CONFIG, database: 'admin_db' } });

    try {
      const countrySG = await adminDb('meta_data_details').where('code', 'SG').first();
      const tenantTypeEnterprise = await adminDb('meta_data_details').where('code', 'enterprise').first();

      let tenantUid;
      const existing = await adminDb('tenants').where('code', ENTERPRISE_TENANT.code).first();
      if (existing) {
        tenantUid = existing.uid;
        console.log(`  Tenant already exists: ${tenantUid}`);
      } else {
        const [tenant] = await adminDb('tenants')
          .insert({
            code: ENTERPRISE_TENANT.code,
            name: ENTERPRISE_TENANT.name,
            tenant_type_uid: tenantTypeEnterprise?.uid || null,
            country_uid: countrySG?.uid || null,
            db_strategy: 'dedicated',
            db_host: DB_CONFIG.host,
            db_port: DB_CONFIG.port,
            db_name: ENTERPRISE_TENANT.dbName,
            db_user: DB_CONFIG.user,
            db_password: DB_CONFIG.password,
          })
          .returning('*');
        tenantUid = tenant.uid;
        console.log(`  Created enterprise tenant: ${tenantUid}`);
      }

      // Branch
      let branchUid;
      const existingBranch = await adminDb('branches')
        .where({ tenant_uid: tenantUid, code: 'hq' })
        .first();
      if (existingBranch) {
        branchUid = existingBranch.uid;
        console.log(`  Branch already exists: ${branchUid}`);
      } else {
        const [branch] = await adminDb('branches')
          .insert({
            tenant_uid: tenantUid,
            code: 'hq',
            name: 'Singapore HQ',
            city: 'Singapore',
            country_uid: countrySG?.uid || null,
          })
          .returning('*');
        branchUid = branch.uid;
        console.log(`  Created branch: ${branchUid}`);
      }

      // App customers
      async function ensureAppCustomer(email, firstName, lastName) {
        const ex = await adminDb('app_customers').where('email', email).first();
        if (ex) {
          console.log(`  App customer ${email} already exists: ${ex.uid}`);
          return ex.uid;
        }
        const [cust] = await adminDb('app_customers')
          .insert({
            tenant_uid: tenantUid,
            branch_uid: branchUid,
            first_name: firstName,
            last_name: lastName,
            email,
            keycloak_sub: null,
          })
          .returning('*');
        console.log(`  Created app customer ${email}: ${cust.uid}`);
        return cust.uid;
      }

      const adminCustomerUid = await ensureAppCustomer(
        'admin@globalfreight.cargoez.com', 'Global', 'Admin',
      );
      const opsCustomerUid = await ensureAppCustomer(
        'ops@globalfreight.cargoez.com', 'Global', 'Operations',
      );

      // ── Step 4: Seed access control in dedicated DB ──
      // For dedicated DB, tenant_uid is set for consistency but queries won't filter by it
      console.log('\nStep 4: Seeding access control in dedicated database...');

      await enterpriseDb.raw('TRUNCATE app_customer_roles, role_permissions, permissions, roles, operations, modules CASCADE');

      const moduleData = [
        { code: 'dashboard', name: 'Dashboard', sort_order: 1, tenant_uid: tenantUid, is_active: true },
        { code: 'freight', name: 'Freight', sort_order: 2, tenant_uid: tenantUid, is_active: true },
        { code: 'contacts', name: 'Contacts', sort_order: 3, tenant_uid: tenantUid, is_active: true },
        { code: 'books', name: 'Books', sort_order: 4, tenant_uid: tenantUid, is_active: true },
        { code: 'users', name: 'Users', sort_order: 5, tenant_uid: tenantUid, is_active: true },
        { code: 'roles', name: 'Roles', sort_order: 6, tenant_uid: tenantUid, is_active: true },
        { code: 'permissions', name: 'Permissions', sort_order: 7, tenant_uid: tenantUid, is_active: true },
        { code: 'branches', name: 'Branches', sort_order: 8, tenant_uid: tenantUid, is_active: true },
      ];
      const modules = await enterpriseDb('modules').insert(moduleData).returning('*');

      const opData = [
        { code: 'create', name: 'Create', tenant_uid: tenantUid, is_active: true },
        { code: 'read', name: 'Read', tenant_uid: tenantUid, is_active: true },
        { code: 'update', name: 'Update', tenant_uid: tenantUid, is_active: true },
        { code: 'delete', name: 'Delete', tenant_uid: tenantUid, is_active: true },
      ];
      const operations = await enterpriseDb('operations').insert(opData).returning('*');

      const permInserts = [];
      for (const mod of modules) {
        for (const op of operations) {
          permInserts.push({
            module_uid: mod.uid,
            operation_uid: op.uid,
            permission_key: `${mod.code}.${op.code}`,
            tenant_uid: tenantUid,
            is_active: true,
          });
        }
      }
      const permissions = await enterpriseDb('permissions').insert(permInserts).returning('*');

      const roleData = [
        { code: 'tenant_admin', name: 'Tenant Admin', is_system: true, tenant_uid: tenantUid, is_active: true },
        { code: 'manager', name: 'Manager', is_system: true, tenant_uid: tenantUid, is_active: true },
        { code: 'operator', name: 'Operator', is_system: true, tenant_uid: tenantUid, is_active: true },
      ];
      const roles = await enterpriseDb('roles').insert(roleData).returning('*');

      const tenantAdminRole = roles.find((r) => r.code === 'tenant_admin');
      const operatorRole = roles.find((r) => r.code === 'operator');
      const readOp = operations.find((o) => o.code === 'read');
      const updateOp = operations.find((o) => o.code === 'update');

      const rpInserts = [];
      for (const perm of permissions) {
        rpInserts.push({
          role_uid: tenantAdminRole.uid,
          permission_uid: perm.uid,
          granted_by: 'system',
          tenant_uid: tenantUid,
          is_active: true,
        });
      }
      for (const perm of permissions) {
        if (perm.operation_uid === readOp.uid || perm.operation_uid === updateOp.uid) {
          rpInserts.push({
            role_uid: roles.find((r) => r.code === 'manager').uid,
            permission_uid: perm.uid,
            granted_by: 'system',
            tenant_uid: tenantUid,
            is_active: true,
          });
        }
      }
      for (const perm of permissions) {
        if (perm.operation_uid === readOp.uid) {
          rpInserts.push({
            role_uid: operatorRole.uid,
            permission_uid: perm.uid,
            granted_by: 'system',
            tenant_uid: tenantUid,
            is_active: true,
          });
        }
      }
      await enterpriseDb('role_permissions').insert(rpInserts);

      // Assign roles: admin -> tenant_admin, ops -> operator
      await enterpriseDb('app_customer_roles').insert([
        { app_customer_uid: adminCustomerUid, role_uid: tenantAdminRole.uid, tenant_uid: tenantUid, is_active: true },
        { app_customer_uid: opsCustomerUid, role_uid: operatorRole.uid, tenant_uid: tenantUid, is_active: true },
      ]);

      console.log('  Access control seeded');

      // ── Step 5: Seed business data in dedicated DB ──
      console.log('\nStep 5: Seeding business data in dedicated database...');

      await enterpriseDb('invoice_items').del();
      await enterpriseDb('invoices').del();
      await enterpriseDb('contacts').del();
      await enterpriseDb('shipments').del();

      await enterpriseDb('contacts').insert([
        { tenant_uid: tenantUid, contact_type: 'company', company_name: 'Singapore Maritime Holdings', first_name: 'David', last_name: 'Tan', email: 'david@sgmaritime.com', phone: '+65-6100-0001', city: 'Singapore', country: 'SG', is_active: true },
        { tenant_uid: tenantUid, contact_type: 'company', company_name: 'Orient Express Logistics', first_name: 'Mei', last_name: 'Chen', email: 'mei@orientexpress.com', phone: '+65-6100-0002', city: 'Singapore', country: 'SG', is_active: true },
        { tenant_uid: tenantUid, contact_type: 'carrier', company_name: 'Dragon Shipping Lines', first_name: 'Wei', last_name: 'Liu', email: 'wei@dragonshipping.com', phone: '+86-21-5000-0001', city: 'Shanghai', country: 'CN', is_active: true },
        { tenant_uid: tenantUid, contact_type: 'agent', company_name: 'Tokyo Cargo Services', first_name: 'Yuki', last_name: 'Tanaka', email: 'yuki@tokyocargo.jp', phone: '+81-3-5000-0001', city: 'Tokyo', country: 'JP', is_active: true },
        { tenant_uid: tenantUid, contact_type: 'company', company_name: 'Australian Trade Partners', first_name: 'Mark', last_name: 'Thompson', email: 'mark@autradepartners.com.au', phone: '+61-2-9000-0001', city: 'Sydney', country: 'AU', is_active: true },
      ]);

      await enterpriseDb('shipments').insert([
        { tenant_uid: tenantUid, shipment_number: 'SHP-GF-001', origin: 'Singapore', destination: 'Shanghai', mode: 'sea', status: 'in-transit', shipper_name: 'Singapore Maritime Holdings', consignee_name: 'Dragon Shipping Lines', weight: 15000, weight_unit: 'kg', pieces: 500, etd: '2026-03-05', eta: '2026-03-12', is_active: true },
        { tenant_uid: tenantUid, shipment_number: 'SHP-GF-002', origin: 'Tokyo', destination: 'Singapore', mode: 'air', status: 'delivered', shipper_name: 'Tokyo Cargo Services', consignee_name: 'Orient Express Logistics', weight: 350, weight_unit: 'kg', pieces: 15, etd: '2026-02-28', eta: '2026-03-01', is_active: true },
        { tenant_uid: tenantUid, shipment_number: 'SHP-GF-003', origin: 'Singapore', destination: 'Sydney', mode: 'sea', status: 'pending', shipper_name: 'Orient Express Logistics', consignee_name: 'Australian Trade Partners', weight: 8000, weight_unit: 'kg', pieces: 300, etd: '2026-03-20', eta: '2026-03-30', is_active: true },
        { tenant_uid: tenantUid, shipment_number: 'SHP-GF-004', origin: 'Shanghai', destination: 'Tokyo', mode: 'sea', status: 'in-transit', shipper_name: 'Dragon Shipping Lines', consignee_name: 'Tokyo Cargo Services', weight: 6000, weight_unit: 'kg', pieces: 200, etd: '2026-03-08', eta: '2026-03-13', is_active: true },
        { tenant_uid: tenantUid, shipment_number: 'SHP-GF-005', origin: 'Sydney', destination: 'Singapore', mode: 'air', status: 'draft', shipper_name: 'Australian Trade Partners', consignee_name: 'Singapore Maritime Holdings', weight: 180, weight_unit: 'kg', pieces: 8, etd: '2026-04-01', eta: '2026-04-02', is_active: true },
      ]);

      await enterpriseDb('invoices').insert([
        { tenant_uid: tenantUid, invoice_number: 'INV-GF-001', invoice_date: '2026-03-05', due_date: '2026-04-05', currency: 'SGD', subtotal: 45000, tax_amount: 3600, total_amount: 48600, status: 'pending', notes: 'Sea freight SG-Shanghai', is_active: true },
        { tenant_uid: tenantUid, invoice_number: 'INV-GF-002', invoice_date: '2026-02-28', due_date: '2026-03-28', currency: 'USD', subtotal: 8500, tax_amount: 680, total_amount: 9180, status: 'paid', notes: 'Air freight Tokyo-SG', is_active: true },
        { tenant_uid: tenantUid, invoice_number: 'INV-GF-003', invoice_date: '2026-03-01', due_date: '2026-03-31', currency: 'SGD', subtotal: 32000, tax_amount: 2560, total_amount: 34560, status: 'overdue', notes: 'Sea freight SG-Sydney', is_active: true },
        { tenant_uid: tenantUid, invoice_number: 'INV-GF-004', invoice_date: '2026-03-08', due_date: '2026-04-08', currency: 'USD', subtotal: 22000, tax_amount: 1760, total_amount: 23760, status: 'pending', notes: 'Sea freight Shanghai-Tokyo', is_active: true },
      ]);

      console.log('  Business data seeded');

      // Print counts
      const counts = {
        contacts: await enterpriseDb('contacts').count('* as c').first(),
        shipments: await enterpriseDb('shipments').count('* as c').first(),
        invoices: await enterpriseDb('invoices').count('* as c').first(),
      };
      console.log(`  Contacts: ${counts.contacts.c}, Shipments: ${counts.shipments.c}, Invoices: ${counts.invoices.c}`);

      // ── Step 6: Create Keycloak users & sync keycloak_sub ──
      console.log('\nStep 6: Creating Keycloak users and syncing keycloak_sub...');
      const token = await getAdminToken();

      await ensureKeycloakUser(token, {
        email: 'admin@globalfreight.cargoez.com',
        firstName: 'Global',
        lastName: 'Admin',
        password: 'global123',
        tenantId: tenantUid,
      });
      await ensureKeycloakUser(token, {
        email: 'ops@globalfreight.cargoez.com',
        firstName: 'Global',
        lastName: 'Operations',
        password: 'global123',
        tenantId: tenantUid,
      });

      // Sync keycloak_sub for ALL users (including previously created ones)
      console.log('\n  Syncing keycloak_sub for all users...');
      const allEmails = [
        'admin@cargoez.com', 'support@cargoez.com', 'ops@cargoez.com',
        'manager@demo.cargoez.com', 'viewer@demo.cargoez.com',
        'admin@acme.cargoez.com', 'viewer@acme.cargoez.com',
        'admin@globalfreight.cargoez.com', 'ops@globalfreight.cargoez.com',
      ];

      for (const email of allEmails) {
        const kcSub = await getKeycloakSub(token, email);
        if (!kcSub) {
          console.log(`    ${email}: NOT in Keycloak, skipping`);
          continue;
        }

        const sysAdmin = await adminDb('sys_admins').where('email', email).first();
        if (sysAdmin) {
          await adminDb('sys_admins').where('uid', sysAdmin.uid).update({ keycloak_sub: kcSub });
          console.log(`    ${email}: sys_admins.keycloak_sub = ${kcSub}`);
        }

        const appCust = await adminDb('app_customers').where('email', email).first();
        if (appCust) {
          await adminDb('app_customers').where('uid', appCust.uid).update({ keycloak_sub: kcSub });
          console.log(`    ${email}: app_customers.keycloak_sub = ${kcSub}`);
        }
      }

      // ── Done ──
      console.log('\n=== Enterprise Tenant Setup Complete ===');
      console.log('\n--- All Tenants Summary ---');
      console.log('1. Demo Logistics (demo)      - shared_db  - Normal');
      console.log('2. Acme Logistics (acme)       - shared_db  - Normal');
      console.log(`3. Global Freight Corp (globalfreight) - ${ENTERPRISE_TENANT.dbName} - Enterprise (dedicated)`);
      console.log('\n--- Test Credentials (Tenant Portal: http://localhost:5173) ---');
      console.log('Demo Tenant:');
      console.log('  manager@demo.cargoez.com / demo123           (Tenant Admin)');
      console.log('  viewer@demo.cargoez.com / demo123             (Operator - read only)');
      console.log('Acme Tenant:');
      console.log('  admin@acme.cargoez.com / acme123              (Tenant Admin)');
      console.log('  viewer@acme.cargoez.com / acme123             (Operator - read only)');
      console.log('Global Freight Corp (Enterprise):');
      console.log('  admin@globalfreight.cargoez.com / global123   (Tenant Admin)');
      console.log('  ops@globalfreight.cargoez.com / global123     (Operator - read only)');

      await adminDb.destroy();
    } catch (err) {
      await adminDb.destroy();
      throw err;
    }
  } finally {
    await enterpriseDb.destroy();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
