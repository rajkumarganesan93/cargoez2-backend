const http = require('http');
const https = require('https');
const Knex = require('knex');

const KC_URL = 'http://localhost:8080';
const REALM = 'cargoez';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Rajkumar17#',
};

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const mod = urlObj.protocol === 'https:' ? https : http;
    const req = mod.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
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

async function createUser(token, user) {
  const existing = await httpRequest(
    `${KC_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(user.email)}&exact=true`,
    { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
  );
  const users = JSON.parse(existing.body);
  if (users.length > 0) {
    console.log(`User ${user.email} already exists: ${users[0].id}`);
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
    attributes: {
      tenant_id: [user.tenantId || ''],
      user_type: [user.userType || 'app_customer'],
    },
  });

  const res = await httpRequest(`${KC_URL}/admin/realms/${REALM}/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }, payload);

  if (res.status === 201) {
    const location = res.headers.location;
    const id = location.split('/').pop();
    console.log(`Created user ${user.email}: ${id}`);
    return id;
  } else {
    console.error(`Failed to create ${user.email}: ${res.status} ${res.body}`);
    return null;
  }
}

async function run() {
  const token = await getAdminToken();

  const acmeTenantUid = '0f4efc31-fd40-4e60-836f-94c08cc567d3';

  const acmeAdminId = await createUser(token, {
    email: 'admin@acme.cargoez.com',
    firstName: 'Acme',
    lastName: 'Admin',
    password: 'acme123',
    tenantId: acmeTenantUid,
    userType: 'app_customer',
  });

  const acmeViewerId = await createUser(token, {
    email: 'viewer@acme.cargoez.com',
    firstName: 'Acme',
    lastName: 'Viewer',
    password: 'acme123',
    tenantId: acmeTenantUid,
    userType: 'app_customer',
  });

  // Now get ALL existing user keycloak subs and sync to DB
  console.log('\n--- Syncing keycloak_sub for all users ---');

  const adminDb = Knex({ client: 'pg', connection: { ...DB_CONFIG, database: 'admin_db' } });

  try {
    const userEmails = [
      'admin@cargoez.com', 'support@cargoez.com', 'ops@cargoez.com',
      'manager@demo.cargoez.com', 'viewer@demo.cargoez.com',
      'admin@acme.cargoez.com', 'viewer@acme.cargoez.com',
    ];

    for (const email of userEmails) {
      const res = await httpRequest(
        `${KC_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(email)}&exact=true`,
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      );
      const users = JSON.parse(res.body);
      if (users.length === 0) {
        console.log(`  ${email}: NOT found in Keycloak`);
        continue;
      }
      const kcSub = users[0].id;

      // sys_admins
      const sysAdmin = await adminDb('sys_admins').where('email', email).first();
      if (sysAdmin) {
        await adminDb('sys_admins').where('uid', sysAdmin.uid).update({ keycloak_sub: kcSub });
        console.log(`  ${email}: updated sys_admins.keycloak_sub = ${kcSub}`);
      }

      // app_customers
      const appCustomer = await adminDb('app_customers').where('email', email).first();
      if (appCustomer) {
        await adminDb('app_customers').where('uid', appCustomer.uid).update({ keycloak_sub: kcSub });
        console.log(`  ${email}: updated app_customers.keycloak_sub = ${kcSub}`);
      }
    }

    console.log('\n=== Keycloak sync complete ===');
    console.log('\n--- Test Credentials ---');
    console.log('Admin Portal (localhost:5177):');
    console.log('  admin@cargoez.com / admin123   (Super Admin)');
    console.log('  support@cargoez.com / support123 (Support Agent)');
    console.log('  ops@cargoez.com / ops123       (Operations Manager)');
    console.log('\nTenant Portal (localhost:5173):');
    console.log('  Demo Tenant:');
    console.log('    manager@demo.cargoez.com / demo123  (Tenant Admin - sees demo data)');
    console.log('    viewer@demo.cargoez.com / demo123   (Operator - read only demo data)');
    console.log('  Acme Tenant:');
    console.log('    admin@acme.cargoez.com / acme123    (Tenant Admin - sees acme data)');
    console.log('    viewer@acme.cargoez.com / acme123   (Operator - read only acme data)');

  } finally {
    await adminDb.destroy();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
