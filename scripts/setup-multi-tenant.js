const Knex = require('knex');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Rajkumar17#',
};

async function run() {
  const adminDb = Knex({ client: 'pg', connection: { ...DB_CONFIG, database: 'admin_db' } });
  const sharedDb = Knex({ client: 'pg', connection: { ...DB_CONFIG, database: 'shared_db' } });

  try {
    // =========================================================
    // 1. Check shared_db tables exist
    // =========================================================
    const sharedTables = await sharedDb.raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    console.log('shared_db tables:', sharedTables.rows.map(r => r.tablename));

    // =========================================================
    // 2. Get existing demo tenant UID
    // =========================================================
    const demoTenant = await adminDb('tenants').where('code', 'demo').first();
    if (!demoTenant) throw new Error('Demo tenant not found in admin_db');
    console.log('Demo Tenant UID:', demoTenant.uid);

    // =========================================================
    // 3. Create "Acme Logistics" tenant in admin_db
    // =========================================================
    const existingAcme = await adminDb('tenants').where('code', 'acme').first();
    let acmeTenantUid;

    if (existingAcme) {
      acmeTenantUid = existingAcme.uid;
      console.log('Acme tenant already exists:', acmeTenantUid);
    } else {
      const countryUS = await adminDb('meta_data_details').where('code', 'US').first();
      const tenantTypeNormal = await adminDb('meta_data_details').where('code', 'normal').first();
      const [acmeTenant] = await adminDb('tenants').insert({
        code: 'acme',
        name: 'Acme Logistics',
        tenant_type_uid: tenantTypeNormal?.uid || null,
        country_uid: countryUS?.uid || null,
        db_strategy: 'shared',
      }).returning('uid');
      acmeTenantUid = acmeTenant.uid;
      console.log('Created Acme tenant:', acmeTenantUid);
    }

    // =========================================================
    // 4. Create branch for Acme
    // =========================================================
    let acmeBranchUid;
    const existingBranch = await adminDb('branches').where({ tenant_uid: acmeTenantUid, code: 'main' }).first();
    if (existingBranch) {
      acmeBranchUid = existingBranch.uid;
      console.log('Acme branch already exists:', acmeBranchUid);
    } else {
      const countryUS = await adminDb('meta_data_details').where('code', 'US').first();
      const [branch] = await adminDb('branches').insert({
        tenant_uid: acmeTenantUid,
        code: 'main',
        name: 'Main Office',
        country_uid: countryUS?.uid || null,
      }).returning('uid');
      acmeBranchUid = branch.uid;
      console.log('Created Acme branch:', acmeBranchUid);
    }

    // =========================================================
    // 5. Create app_customer for Acme
    // =========================================================
    const existingAcmeCustomer = await adminDb('app_customers').where('email', 'admin@acme.cargoez.com').first();
    let acmeCustomerUid;
    if (existingAcmeCustomer) {
      acmeCustomerUid = existingAcmeCustomer.uid;
      console.log('Acme customer already exists:', acmeCustomerUid);
    } else {
      const [customer] = await adminDb('app_customers').insert({
        tenant_uid: acmeTenantUid,
        branch_uid: acmeBranchUid,
        first_name: 'Acme',
        last_name: 'Admin',
        email: 'admin@acme.cargoez.com',
        keycloak_sub: null,
      }).returning('*');
      acmeCustomerUid = customer.uid;
      console.log('Created Acme customer:', acmeCustomerUid);
    }

    // Also create a viewer for Acme
    const existingAcmeViewer = await adminDb('app_customers').where('email', 'viewer@acme.cargoez.com').first();
    let acmeViewerUid;
    if (existingAcmeViewer) {
      acmeViewerUid = existingAcmeViewer.uid;
    } else {
      const [viewer] = await adminDb('app_customers').insert({
        tenant_uid: acmeTenantUid,
        branch_uid: acmeBranchUid,
        first_name: 'Acme',
        last_name: 'Viewer',
        email: 'viewer@acme.cargoez.com',
        keycloak_sub: null,
      }).returning('*');
      acmeViewerUid = viewer.uid;
      console.log('Created Acme viewer:', acmeViewerUid);
    }

    // =========================================================
    // 6. Get demo app_customers
    // =========================================================
    const demoManager = await adminDb('app_customers').where('email', 'manager@demo.cargoez.com').first();
    const demoViewer = await adminDb('app_customers').where('email', 'viewer@demo.cargoez.com').first();
    console.log('Demo Manager UID:', demoManager?.uid);
    console.log('Demo Viewer UID:', demoViewer?.uid);

    // =========================================================
    // 7. Seed shared_db: access control for BOTH tenants
    // =========================================================
    await sharedDb.raw('TRUNCATE app_customer_roles, role_permissions, permissions, roles, operations, modules CASCADE');

    for (const { tenantUid, label, adminCustomerUid } of [
      { tenantUid: demoTenant.uid, label: 'demo', adminCustomerUid: demoManager?.uid },
      { tenantUid: acmeTenantUid, label: 'acme', adminCustomerUid: acmeCustomerUid },
    ]) {
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
      const modules = await sharedDb('modules').insert(moduleData).returning('*');

      const opData = [
        { code: 'create', name: 'Create', tenant_uid: tenantUid, is_active: true },
        { code: 'read', name: 'Read', tenant_uid: tenantUid, is_active: true },
        { code: 'update', name: 'Update', tenant_uid: tenantUid, is_active: true },
        { code: 'delete', name: 'Delete', tenant_uid: tenantUid, is_active: true },
      ];
      const operations = await sharedDb('operations').insert(opData).returning('*');

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
      const permissions = await sharedDb('permissions').insert(permInserts).returning('*');

      const roleData = [
        { code: 'tenant_admin', name: 'Tenant Admin', is_system: true, tenant_uid: tenantUid, is_active: true },
        { code: 'manager', name: 'Manager', is_system: true, tenant_uid: tenantUid, is_active: true },
        { code: 'operator', name: 'Operator', is_system: true, tenant_uid: tenantUid, is_active: true },
      ];
      const roles = await sharedDb('roles').insert(roleData).returning('*');

      const tenantAdminRole = roles.find(r => r.code === 'tenant_admin');
      const managerRole = roles.find(r => r.code === 'manager');
      const operatorRole = roles.find(r => r.code === 'operator');
      const readOp = operations.find(o => o.code === 'read');
      const updateOp = operations.find(o => o.code === 'update');

      const rpInserts = [];
      for (const perm of permissions) {
        rpInserts.push({ role_uid: tenantAdminRole.uid, permission_uid: perm.uid, granted_by: 'system', tenant_uid: tenantUid, is_active: true });
      }
      for (const perm of permissions) {
        if (perm.operation_uid === readOp.uid || perm.operation_uid === updateOp.uid) {
          rpInserts.push({ role_uid: managerRole.uid, permission_uid: perm.uid, granted_by: 'system', tenant_uid: tenantUid, is_active: true });
        }
      }
      for (const perm of permissions) {
        if (perm.operation_uid === readOp.uid) {
          rpInserts.push({ role_uid: operatorRole.uid, permission_uid: perm.uid, granted_by: 'system', tenant_uid: tenantUid, is_active: true });
        }
      }
      await sharedDb('role_permissions').insert(rpInserts);

      if (adminCustomerUid) {
        await sharedDb('app_customer_roles').insert({
          app_customer_uid: adminCustomerUid,
          role_uid: tenantAdminRole.uid,
          tenant_uid: tenantUid,
          is_active: true,
        });
      }

      console.log(`Seeded access control for ${label} tenant`);
    }

    // Also assign demo viewer as operator, acme viewer as operator
    const demoOperatorRole = await sharedDb('roles').where({ code: 'operator', tenant_uid: demoTenant.uid }).first();
    if (demoViewer && demoOperatorRole) {
      await sharedDb('app_customer_roles').insert({
        app_customer_uid: demoViewer.uid,
        role_uid: demoOperatorRole.uid,
        tenant_uid: demoTenant.uid,
        is_active: true,
      });
    }

    const acmeOperatorRole = await sharedDb('roles').where({ code: 'operator', tenant_uid: acmeTenantUid }).first();
    if (acmeViewerUid && acmeOperatorRole) {
      await sharedDb('app_customer_roles').insert({
        app_customer_uid: acmeViewerUid,
        role_uid: acmeOperatorRole.uid,
        tenant_uid: acmeTenantUid,
        is_active: true,
      });
    }

    // =========================================================
    // 8. Seed business data in shared_db for BOTH tenants
    // =========================================================
    await sharedDb('invoice_items').del();
    await sharedDb('invoices').del();
    await sharedDb('contacts').del();
    await sharedDb('shipments').del();

    // --- Demo Tenant business data ---
    await sharedDb('contacts').insert([
      { tenant_uid: demoTenant.uid, contact_type: 'company', company_name: 'Global Shipping Co', first_name: 'John', last_name: 'Doe', email: 'john@globalshipping.com', phone: '+91-9876543210', city: 'Mumbai', country: 'IN', is_active: true },
      { tenant_uid: demoTenant.uid, contact_type: 'company', company_name: 'Express Cargo Ltd', first_name: 'Priya', last_name: 'Sharma', email: 'priya@expresscargo.com', phone: '+91-9876543211', city: 'Delhi', country: 'IN', is_active: true },
      { tenant_uid: demoTenant.uid, contact_type: 'agent', company_name: 'Fast Forward Agents', first_name: 'Ravi', last_name: 'Kumar', email: 'ravi@fastforward.com', phone: '+91-9876543212', city: 'Chennai', country: 'IN', is_active: true },
    ]);

    await sharedDb('shipments').insert([
      { tenant_uid: demoTenant.uid, shipment_number: 'SHP-DEMO-001', origin: 'Mumbai', destination: 'Delhi', mode: 'road', status: 'in-transit', shipper_name: 'Global Shipping Co', consignee_name: 'Express Cargo Ltd', weight: 500, weight_unit: 'kg', pieces: 20, etd: '2026-03-10', eta: '2026-03-14', is_active: true },
      { tenant_uid: demoTenant.uid, shipment_number: 'SHP-DEMO-002', origin: 'Chennai', destination: 'Bangalore', mode: 'air', status: 'delivered', shipper_name: 'Fast Forward Agents', consignee_name: 'Express Cargo Ltd', weight: 120, weight_unit: 'kg', pieces: 5, etd: '2026-03-01', eta: '2026-03-02', is_active: true },
      { tenant_uid: demoTenant.uid, shipment_number: 'SHP-DEMO-003', origin: 'Kolkata', destination: 'Mumbai', mode: 'sea', status: 'pending', shipper_name: 'Global Shipping Co', weight: 2000, weight_unit: 'kg', pieces: 100, etd: '2026-03-20', eta: '2026-03-28', is_active: true },
    ]);

    await sharedDb('invoices').insert([
      { tenant_uid: demoTenant.uid, invoice_number: 'INV-DEMO-001', invoice_date: '2026-03-01', due_date: '2026-03-31', currency: 'INR', subtotal: 50000, tax_amount: 9000, total_amount: 59000, status: 'pending', notes: 'Road freight charges', is_active: true },
      { tenant_uid: demoTenant.uid, invoice_number: 'INV-DEMO-002', invoice_date: '2026-02-15', due_date: '2026-03-15', currency: 'INR', subtotal: 25000, tax_amount: 4500, total_amount: 29500, status: 'paid', notes: 'Air cargo charges', is_active: true },
    ]);

    // --- Acme Tenant business data ---
    await sharedDb('contacts').insert([
      { tenant_uid: acmeTenantUid, contact_type: 'company', company_name: 'Pacific Trade Corp', first_name: 'Mike', last_name: 'Johnson', email: 'mike@pacifictrade.com', phone: '+1-555-0201', city: 'Los Angeles', country: 'US', is_active: true },
      { tenant_uid: acmeTenantUid, contact_type: 'company', company_name: 'Atlantic Freight Inc', first_name: 'Sarah', last_name: 'Williams', email: 'sarah@atlanticfreight.com', phone: '+1-555-0202', city: 'New York', country: 'US', is_active: true },
      { tenant_uid: acmeTenantUid, contact_type: 'carrier', company_name: 'Swift Carriers LLC', first_name: 'James', last_name: 'Brown', email: 'james@swiftcarriers.com', phone: '+1-555-0203', city: 'Chicago', country: 'US', is_active: true },
      { tenant_uid: acmeTenantUid, contact_type: 'individual', first_name: 'Emily', last_name: 'Davis', email: 'emily@example.com', phone: '+1-555-0204', city: 'Houston', country: 'US', is_active: true },
    ]);

    await sharedDb('shipments').insert([
      { tenant_uid: acmeTenantUid, shipment_number: 'SHP-ACME-001', origin: 'Los Angeles', destination: 'New York', mode: 'air', status: 'in-transit', shipper_name: 'Pacific Trade Corp', consignee_name: 'Atlantic Freight Inc', weight: 250, weight_unit: 'kg', pieces: 10, etd: '2026-03-08', eta: '2026-03-10', is_active: true },
      { tenant_uid: acmeTenantUid, shipment_number: 'SHP-ACME-002', origin: 'Chicago', destination: 'Houston', mode: 'road', status: 'pending', shipper_name: 'Swift Carriers LLC', consignee_name: 'Pacific Trade Corp', weight: 800, weight_unit: 'kg', pieces: 50, etd: '2026-03-15', eta: '2026-03-18', is_active: true },
      { tenant_uid: acmeTenantUid, shipment_number: 'SHP-ACME-003', origin: 'New York', destination: 'London', mode: 'sea', status: 'delivered', shipper_name: 'Atlantic Freight Inc', weight: 5000, weight_unit: 'kg', pieces: 200, etd: '2026-02-01', eta: '2026-02-20', is_active: true },
      { tenant_uid: acmeTenantUid, shipment_number: 'SHP-ACME-004', origin: 'Miami', destination: 'Tokyo', mode: 'air', status: 'draft', shipper_name: 'Pacific Trade Corp', weight: 150, weight_unit: 'kg', pieces: 8, etd: '2026-04-01', eta: '2026-04-03', is_active: true },
    ]);

    await sharedDb('invoices').insert([
      { tenant_uid: acmeTenantUid, invoice_number: 'INV-ACME-001', invoice_date: '2026-03-05', due_date: '2026-04-05', currency: 'USD', subtotal: 12500.50, tax_amount: 2250.09, total_amount: 14750.59, status: 'pending', notes: 'Air freight LA-NY', is_active: true },
      { tenant_uid: acmeTenantUid, invoice_number: 'INV-ACME-002', invoice_date: '2026-02-01', due_date: '2026-03-01', currency: 'USD', subtotal: 35000, tax_amount: 6300, total_amount: 41300, status: 'paid', notes: 'Sea freight NY-London', is_active: true },
      { tenant_uid: acmeTenantUid, invoice_number: 'INV-ACME-003', invoice_date: '2026-02-20', due_date: '2026-03-20', currency: 'USD', subtotal: 8750, tax_amount: 1575, total_amount: 10325, status: 'overdue', notes: 'Road freight Chicago-Houston', is_active: true },
    ]);

    console.log('\n=== Business data seeded for both tenants ===');
    console.log('\n--- Summary ---');
    const demoCounts = {
      contacts: await sharedDb('contacts').where('tenant_uid', demoTenant.uid).count('* as c').first(),
      shipments: await sharedDb('shipments').where('tenant_uid', demoTenant.uid).count('* as c').first(),
      invoices: await sharedDb('invoices').where('tenant_uid', demoTenant.uid).count('* as c').first(),
    };
    const acmeCounts = {
      contacts: await sharedDb('contacts').where('tenant_uid', acmeTenantUid).count('* as c').first(),
      shipments: await sharedDb('shipments').where('tenant_uid', acmeTenantUid).count('* as c').first(),
      invoices: await sharedDb('invoices').where('tenant_uid', acmeTenantUid).count('* as c').first(),
    };
    console.log(`Demo Tenant - Contacts: ${demoCounts.contacts.c}, Shipments: ${demoCounts.shipments.c}, Invoices: ${demoCounts.invoices.c}`);
    console.log(`Acme Tenant - Contacts: ${acmeCounts.contacts.c}, Shipments: ${acmeCounts.shipments.c}, Invoices: ${acmeCounts.invoices.c}`);

    console.log('\n=== Next: Create Keycloak users for Acme ===');
    console.log('Acme Tenant UID:', acmeTenantUid);
    console.log('Acme Admin Customer UID:', acmeCustomerUid);
    console.log('Acme Viewer Customer UID:', acmeViewerUid);

  } finally {
    await adminDb.destroy();
    await sharedDb.destroy();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
