# CargoEz — Temporal Workflow Team Handover

> This document describes the current CargoEz multi-tenant architecture, the tenant provisioning workflow that Temporal needs to automate, and all integration points between the existing backend and the Temporal workflow engine.

---

## Table of Contents

1. [Architecture Summary](#1-architecture-summary)
2. [Multi-Tenant Database Strategy](#2-multi-tenant-database-strategy)
3. [Tenant Provisioning Workflow](#3-tenant-provisioning-workflow)
4. [Workflow Activities (Step-by-Step)](#4-workflow-activities-step-by-step)
5. [API Contracts](#5-api-contracts)
6. [Database Schemas](#6-database-schemas)
7. [Keycloak Admin API Integration](#7-keycloak-admin-api-integration)
8. [Access Control Seeding](#8-access-control-seeding)
9. [Reference Scripts](#9-reference-scripts)
10. [Error Handling & Compensation](#10-error-handling--compensation)
11. [Environment & Configuration](#11-environment--configuration)
12. [Testing Checklist](#12-testing-checklist)

---

## 1. Architecture Summary

CargoEz is a multi-tenant SaaS platform for logistics. The backend consists of:

| Service | Port | Database | Role |
|---|---|---|---|
| `admin-service` | 3001 | `admin_db` (24 tables) | Central management, tenant provisioning, user identity, resolve-context |
| `freight-service` | 3002 | Tenant DBs only | Freight / shipment operations |
| `contacts-service` | 3003 | Tenant DBs only | Contact management |
| `books-service` | 3004 | Tenant DBs only | Books / accounting |
| `api-portal` | 4000 | — | Swagger aggregator + reverse proxy |

**Authentication**: Keycloak (OAuth 2.0 / OIDC / PKCE), realm: `cargoez`

**Authorization**: Pure ABAC — permissions stored in tenant databases, evaluated via `@RequirePermission()` decorator

**Key concept**: When the admin creates a tenant via the Admin Portal, the system currently only inserts a record in `admin_db.tenants`. **Temporal's job** is to handle everything that happens _after_ tenant creation — database setup, access control seeding, Keycloak user provisioning, and `keycloak_sub` synchronization.

---

## 2. Multi-Tenant Database Strategy

CargoEz uses a **3-database strategy**:

```
┌──────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                   │
│                                                               │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐     │
│  │ admin_db │   │shared_db │   │ {tenant_code}_db     │     │
│  │ (central)│   │ (shared) │   │ (per enterprise      │     │
│  │ 24 tables│   │ 10 tables│   │  tenant) 10 tables   │     │
│  └──────────┘   └──────────┘   └──────────────────────┘     │
│                                                               │
│  admin_db:       Central identity, tenant registry,           │
│                  admin roles & permissions, subscriptions      │
│                                                               │
│  shared_db:      Shared by ALL "normal" tenants.              │
│                  Each row has tenant_uid for isolation.        │
│                                                               │
│  {code}_db:      Dedicated database for "enterprise" tenants. │
│                  Same 10-table schema as shared_db.            │
│                  No tenant_uid filtering needed.               │
└──────────────────────────────────────────────────────────────┘
```

### Tenant Types

| `db_strategy` | Database | Isolation | When to Use |
|---|---|---|---|
| `shared` | `shared_db` | Row-level (`tenant_uid` on every row) | Normal/small tenants |
| `dedicated` | `{tenant_code}_db` | Database-level (own database) | Enterprise tenants |

The `tenants` table in `admin_db` stores which strategy each tenant uses:

```sql
SELECT code, name, db_strategy, db_name, db_host, db_port, db_user, db_password
FROM tenants
WHERE code = 'globalfreight';
-- Returns: db_strategy='dedicated', db_name='globalfreight_db', ...
```

---

## 3. Tenant Provisioning Workflow

When an admin creates a new tenant, Temporal should orchestrate the following workflow:

```
Admin creates tenant via API
  │
  ▼
┌─────────────────────────────────────┐
│  Temporal Workflow: ProvisionTenant  │
│                                      │
│  Input:                              │
│    tenantUid: string                 │
│    tenantCode: string                │
│    tenantName: string                │
│    dbStrategy: 'shared' | 'dedicated'│
│    adminEmail: string                │
│    adminPassword: string             │
│    adminFirstName: string            │
│    adminLastName: string             │
└──────────┬──────────────────────────┘
           │
           ├── Activity 1: Resolve tenant type
           │   Read tenant from admin_db, determine db_strategy
           │
           ├── Activity 2: Database provisioning
           │   ├── If 'dedicated': CREATE DATABASE, run migrations
           │   └── If 'shared': Skip (shared_db already exists)
           │
           ├── Activity 3: Seed access control
           │   Insert modules, operations, roles, permissions,
           │   role_permissions into the tenant DB
           │
           ├── Activity 4: Create branch in admin_db
           │   Insert a default "main" branch for the tenant
           │
           ├── Activity 5: Create app_customer in admin_db
           │   Insert the tenant's admin user into admin_db.app_customers
           │
           ├── Activity 6: Create Keycloak user
           │   POST to Keycloak Admin API to create the user
           │   with realm role 'app_customer'
           │
           ├── Activity 7: Sync keycloak_sub
           │   Read Keycloak user UUID, update admin_db.app_customers.keycloak_sub
           │
           └── Activity 8: Assign role to app_customer
               Insert into tenant DB: app_customer_roles (admin role)
```

---

## 4. Workflow Activities (Step-by-Step)

### Activity 1: Resolve Tenant

Query `admin_db.tenants` to get the full tenant record:

```sql
SELECT * FROM tenants WHERE uid = :tenantUid AND is_active = true;
```

From this record, extract:
- `db_strategy` — `'shared'` or `'dedicated'`
- `db_name` — for dedicated tenants, the database name (e.g., `globalfreight_db`)
- `db_host`, `db_port`, `db_user`, `db_password` — connection overrides (nullable, fall back to env vars)

### Activity 2: Database Provisioning (Dedicated Only)

**Skip this activity** if `db_strategy = 'shared'`.

For dedicated tenants:

```sql
-- Connect to 'postgres' default database
CREATE DATABASE "{tenant_code}_db";
```

Then connect to the new database and create all 10 tables. The schema is identical to `shared_db`. See [Section 6: Database Schemas](#6-database-schemas) for the complete table definitions.

### Activity 3: Seed Access Control

Connect to the tenant's database (`shared_db` or `{tenant_code}_db`).

For `shared` tenants, **all rows must include `tenant_uid`** for isolation.
For `dedicated` tenants, `tenant_uid` can be set but is not used for filtering.

Seed the following data:

#### 3a. Modules

```sql
INSERT INTO modules (tenant_uid, code, name, description, icon, sort_order) VALUES
(:tenantUid, 'contacts', 'Contacts', 'Contact management', 'contacts', 1),
(:tenantUid, 'freight', 'Freight', 'Freight management', 'freight', 2),
(:tenantUid, 'books', 'Books', 'Accounting', 'books', 3);
```

#### 3b. Operations

```sql
INSERT INTO operations (tenant_uid, code, name) VALUES
(:tenantUid, 'create', 'Create'),
(:tenantUid, 'read', 'Read'),
(:tenantUid, 'update', 'Update'),
(:tenantUid, 'delete', 'Delete');
```

#### 3c. Roles

```sql
INSERT INTO roles (tenant_uid, code, name, description, is_system) VALUES
(:tenantUid, 'admin', 'Administrator', 'Full access to all modules', true),
(:tenantUid, 'manager', 'Manager', 'Read and update access', false),
(:tenantUid, 'viewer', 'Viewer', 'Read-only access', false);
```

#### 3d. Permissions

For each module x operation combination, create a permission:

```sql
-- For each module (contacts, freight, books)
-- For each operation (create, read, update, delete)
INSERT INTO permissions (tenant_uid, module_uid, operation_uid, permission_key) VALUES
(:tenantUid, :moduleUid, :createOpUid, 'contacts.create'),
(:tenantUid, :moduleUid, :readOpUid, 'contacts.read'),
-- ... repeat for all 12 combinations (3 modules x 4 operations)
```

#### 3e. Role Permissions

Map roles to permissions:

| Role | Permissions |
|---|---|
| `admin` | ALL 12 permissions |
| `manager` | `*.read`, `*.update` (8 permissions) |
| `viewer` | `*.read` only (3 permissions) |

```sql
INSERT INTO role_permissions (tenant_uid, role_uid, permission_uid, granted_by) VALUES
(:tenantUid, :adminRoleUid, :permissionUid, 'system');
-- Repeat for each role-permission mapping
```

### Activity 4: Create Branch in admin_db

```sql
INSERT INTO branches (tenant_uid, code, name) VALUES
(:tenantUid, 'main', ':tenantName - Main Branch');
```

Returns: `branch_uid`

### Activity 5: Create App Customer in admin_db

```sql
INSERT INTO app_customers (tenant_uid, branch_uid, first_name, last_name, email) VALUES
(:tenantUid, :branchUid, :firstName, :lastName, :email);
```

Returns: `app_customer_uid`

### Activity 6: Create Keycloak User

Use the Keycloak Admin REST API:

```
POST /admin/realms/cargoez/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "manager@acme.cargoez.com",
  "email": "manager@acme.cargoez.com",
  "firstName": "Acme",
  "lastName": "Manager",
  "enabled": true,
  "emailVerified": true,
  "credentials": [
    { "type": "password", "value": "acme123", "temporary": false }
  ],
  "attributes": {
    "tenant_id": ["<tenant_uid>"],
    "user_type": ["app_customer"]
  }
}
```

See [Section 7: Keycloak Admin API Integration](#7-keycloak-admin-api-integration) for full details.

### Activity 7: Sync keycloak_sub

After creating the Keycloak user, retrieve their Keycloak UUID:

```
GET /admin/realms/cargoez/users?email={email}&exact=true
Authorization: Bearer <admin_token>
```

Response returns the user's `id` (Keycloak UUID). Update the app_customer record:

```sql
UPDATE app_customers
SET keycloak_sub = :keycloakUuid
WHERE uid = :appCustomerUid;
```

**This step is critical.** Without the `keycloak_sub`, the user's JWT cannot be mapped to their identity, and all API calls will fail with 401.

### Activity 8: Assign Role to App Customer

Insert into the tenant database (`shared_db` or `{tenant_code}_db`):

```sql
INSERT INTO app_customer_roles (tenant_uid, app_customer_uid, role_uid) VALUES
(:tenantUid, :appCustomerUid, :adminRoleUid);
```

This grants the tenant's admin user the `admin` role, giving them full CRUD permissions.

---

## 5. API Contracts

### Tenant CRUD (admin-service)

All endpoints are prefixed with `/admin-service/`.

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/tenants` | — | List tenants (paginated, searchable) |
| `GET` | `/tenants/:uid` | — | Get tenant by UID |
| `POST` | `/tenants` | `CreateTenantDto` | Create tenant |
| `PUT` | `/tenants/:uid` | `UpdateTenantDto` | Update tenant |
| `DELETE` | `/tenants/:uid` | — | Soft-delete tenant |

#### CreateTenantDto

```json
{
  "code": "acme",
  "name": "Acme Logistics",
  "tenantTypeUid": "uuid-of-tenant-type",
  "countryUid": "uuid-of-country",
  "dbStrategy": "shared",
  "logoUrl": "https://..."
}
```

`dbStrategy` defaults to `"shared"`. Set to `"dedicated"` for enterprise tenants.

### App Customer CRUD (admin-service)

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/app-customers` | — | List app customers (paginated) |
| `GET` | `/app-customers/:uid` | — | Get by UID |
| `POST` | `/app-customers` | `CreateAppCustomerDto` | Create app customer |
| `PUT` | `/app-customers/:uid` | `UpdateAppCustomerDto` | Update |
| `DELETE` | `/app-customers/:uid` | — | Soft-delete |

### Branch CRUD (admin-service)

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/branches` | — | List branches |
| `POST` | `/branches` | `CreateBranchDto` | Create branch |

### Resolve Context (Internal)

```
GET /internal/resolve-context
Authorization: Bearer <JWT>
```

Returns user identity, tenant DB config, and permissions. This is called by all services on every authenticated request.

### API Response Envelope

All APIs return:

```json
{
  "success": true,
  "messageCode": "CREATED",
  "message": "Resource created successfully",
  "data": { ... }
}
```

---

## 6. Database Schemas

### admin_db — Key Tables for Tenant Provisioning

#### tenants

| Column | Type | Description |
|---|---|---|
| `uid` | uuid (PK) | Tenant identifier |
| `code` | string (UNIQUE) | Short code, used in DB name for dedicated tenants |
| `name` | string | Display name |
| `tenant_type_uid` | uuid (FK -> meta_data_details) | Tenant type (normal/enterprise) |
| `country_uid` | uuid (FK -> meta_data_details) | Country reference |
| `db_strategy` | string | `'shared'` or `'dedicated'` |
| `db_host` | string (nullable) | Database host override |
| `db_port` | integer (nullable) | Database port override |
| `db_name` | string (nullable) | Database name (for dedicated) |
| `db_user` | string (nullable) | Database user override |
| `db_password` | string (nullable) | Database password override |
| `logo_url` | string (nullable) | Tenant logo |
| + base entity columns | | uid, tenant_uid, is_active, created_at, modified_at, created_by, modified_by |

#### branches

| Column | Type | Description |
|---|---|---|
| `code` | string | Branch code |
| `name` | string | Branch name |
| `address` | string (nullable) | Address |
| `city` | string (nullable) | City |
| `country_uid` | uuid (FK -> meta_data_details) | Country |
| UNIQUE | (tenant_uid, code) | |

#### app_customers

| Column | Type | Description |
|---|---|---|
| `branch_uid` | uuid (FK -> branches) | Branch association |
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `email` | string (UNIQUE) | Email (login identifier) |
| `phone` | string (nullable) | Phone number |
| `keycloak_sub` | string (nullable) | Keycloak user UUID — **must be set after Keycloak user creation** |

### shared_db / {tenant_code}_db — All 10 Tables

These are the tables that must be created in dedicated tenant databases. For shared tenants, they already exist in `shared_db`.

| Table | Purpose |
|---|---|
| `modules` | Application modules (contacts, freight, books) |
| `operations` | CRUD operations (create, read, update, delete) |
| `roles` | Tenant-specific roles (admin, manager, viewer) |
| `permissions` | Module-operation permission keys |
| `role_permissions` | Role-to-permission mappings with ABAC conditions |
| `app_customer_roles` | App customer-to-role assignments |
| `shipments` | Freight shipment data |
| `contacts` | Contact directory |
| `invoices` | Invoice headers |
| `invoice_items` | Invoice line items |

For complete column specifications, see:
- `docs/CargoEz-Database-Schema.docx`
- `docs/CargoEz-Database-Schema.xlsx`

---

## 7. Keycloak Admin API Integration

### Getting an Admin Token

```
POST http://localhost:8080/realms/master/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=password&client_id=admin-cli&username=admin&password=admin
```

Response: `{ "access_token": "..." }`

### Creating a User

```
POST http://localhost:8080/admin/realms/cargoez/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "user@tenant.cargoez.com",
  "email": "user@tenant.cargoez.com",
  "firstName": "First",
  "lastName": "Last",
  "enabled": true,
  "emailVerified": true,
  "credentials": [
    { "type": "password", "value": "password123", "temporary": false }
  ],
  "attributes": {
    "tenant_id": ["<tenant_uid>"],
    "user_type": ["app_customer"]
  }
}
```

**Response**: `201 Created` with `Location` header containing the user URL.

### Retrieving User UUID

```
GET http://localhost:8080/admin/realms/cargoez/users?email=user@tenant.cargoez.com&exact=true
Authorization: Bearer <admin_token>
```

Response: Array of user objects. The `id` field is the Keycloak UUID (= `keycloak_sub`).

### Assigning Realm Roles (Optional)

If you need to assign realm roles like `app_customer`:

```
GET http://localhost:8080/admin/realms/cargoez/roles
-- Find the role ID for 'app_customer'

POST http://localhost:8080/admin/realms/cargoez/users/{userId}/role-mappings/realm
Authorization: Bearer <admin_token>
Content-Type: application/json

[{ "id": "<role_id>", "name": "app_customer" }]
```

### Important Notes

- Admin tokens from the `master` realm expire quickly (~60 seconds). Refresh before each batch of operations.
- The `admin-cli` client in the `master` realm has admin privileges by default.
- User attributes (`tenant_id`, `user_type`) are stored in Keycloak but are not in the JWT by default — identity is resolved via the `resolve-context` endpoint.

---

## 8. Access Control Seeding

### Standard Module Set

Every new tenant should get these modules:

| Code | Name | Sort Order |
|---|---|---|
| `contacts` | Contacts | 1 |
| `freight` | Freight | 2 |
| `books` | Books | 3 |

### Standard Operations

| Code | Name |
|---|---|
| `create` | Create |
| `read` | Read |
| `update` | Update |
| `delete` | Delete |

### Standard Roles

| Code | Name | Is System | Permissions |
|---|---|---|---|
| `admin` | Administrator | true | All 12 (3 modules x 4 ops) |
| `manager` | Manager | false | `*.read` + `*.update` (6 permissions) |
| `viewer` | Viewer | false | `*.read` only (3 permissions) |

### Permission Key Format

```
{module_code}.{operation_code}
```

Examples: `contacts.create`, `freight.read`, `books.delete`

### Generating Permissions

```
For each module in [contacts, freight, books]:
  For each operation in [create, read, update, delete]:
    INSERT permission with key = "{module.code}.{operation.code}"
```

This creates 12 permissions per tenant.

---

## 9. Reference Scripts

The following Node.js scripts demonstrate the complete provisioning process. Use these as reference implementations for the Temporal activities:

| Script | What It Does |
|---|---|
| `scripts/setup-multi-tenant.js` | Creates a "shared" tenant (Acme Logistics) in `shared_db`. Seeds access control + business data. Creates Keycloak users. Syncs `keycloak_sub`. |
| `scripts/setup-enterprise-tenant.js` | Creates a "dedicated" tenant (Global Freight Corp). Creates the database, runs migrations, seeds all data, creates Keycloak users, syncs `keycloak_sub`. |
| `scripts/setup-keycloak-acme.js` | Creates Keycloak users for the Acme tenant and syncs `keycloak_sub` values. |

### Key Patterns in Scripts

1. **Idempotency**: All scripts check for existing records before inserting (safe to re-run).
2. **Keycloak token refresh**: Get a fresh admin token before each batch of operations.
3. **keycloak_sub sync**: After creating Keycloak users, the script queries Keycloak for the user UUID and updates `admin_db.app_customers.keycloak_sub`.
4. **Dedicated DB creation**: Uses `CREATE DATABASE` via a connection to the `postgres` default database, then reconnects to the new database for table creation.

---

## 10. Error Handling & Compensation

### Workflow Compensation Strategy

If any activity fails, the Temporal workflow should compensate:

| Failed Activity | Compensation |
|---|---|
| Database creation fails | Log error, mark tenant as `provisioning_failed` |
| Table migration fails | Drop the database if it was just created |
| Access control seeding fails | Delete seeded rows (or drop DB for dedicated) |
| Keycloak user creation fails | Delete app_customer from admin_db, clean up branch |
| keycloak_sub sync fails | Retry — this is the most critical step |

### Critical Failure Points

1. **Database creation** — if PostgreSQL is unreachable or out of disk space
2. **Keycloak availability** — if Keycloak is down, user creation will fail
3. **keycloak_sub mismatch** — if the sync fails, the user cannot authenticate. **This must be retried until successful.**

### Recommended Retry Policy

| Activity | Max Retries | Backoff |
|---|---|---|
| Database creation | 3 | Exponential (1s, 2s, 4s) |
| Table migration | 2 | Fixed (2s) |
| Access control seeding | 3 | Exponential (1s, 2s, 4s) |
| Keycloak user creation | 5 | Exponential (2s, 4s, 8s, 16s, 32s) |
| keycloak_sub sync | 10 | Exponential (1s, 2s, 4s, ...) |

---

## 11. Environment & Configuration

### Backend .env Variables

```env
# PostgreSQL (admin_db direct connection)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<password>
ADMIN_SERVICE_DB_NAME=admin_db

# Shared tenant database
SHARED_DB_HOST=localhost
SHARED_DB_PORT=5432
SHARED_DB_NAME=shared_db
SHARED_DB_USER=postgres
SHARED_DB_PASSWORD=<password>

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=cargoez
KEYCLOAK_ISSUER=http://localhost:8080/realms/cargoez

# Service ports
ADMIN_SERVICE_PORT=3001
FREIGHT_SERVICE_PORT=3002
CONTACTS_SERVICE_PORT=3003
BOOKS_SERVICE_PORT=3004

# Admin service URL (for resolve-context)
ADMIN_SERVICE_URL=http://localhost:3001
```

### Keycloak Configuration

| Setting | Value |
|---|---|
| Realm | `cargoez` |
| Admin Console | http://localhost:8080/admin |
| Admin User | `admin` / `admin` |
| Admin CLI Client | `admin-cli` (master realm) |
| App Clients | `cargoez-admin`, `cargoez-web` |

### Existing Tenants (for reference)

| Tenant | Code | Strategy | Database | Users |
|---|---|---|---|---|
| Demo Logistics | `demo` | shared | `shared_db` | manager@demo.cargoez.com, viewer@demo.cargoez.com |
| Acme Logistics | `acme` | shared | `shared_db` | manager@acme.cargoez.com, viewer@acme.cargoez.com |
| Global Freight Corp | `globalfreight` | dedicated | `globalfreight_db` | admin@globalfreight.cargoez.com, ops@globalfreight.cargoez.com |

---

## 12. Testing Checklist

After implementing the Temporal workflow, verify:

### Shared Tenant Provisioning

- [ ] Create a new shared tenant via `POST /admin-service/tenants` with `dbStrategy: "shared"`
- [ ] Workflow creates branch in `admin_db`
- [ ] Workflow creates app_customer in `admin_db`
- [ ] Workflow seeds modules, operations, roles, permissions in `shared_db` with correct `tenant_uid`
- [ ] Workflow creates Keycloak user
- [ ] Workflow syncs `keycloak_sub` to `admin_db.app_customers`
- [ ] Workflow assigns admin role to app_customer in `shared_db.app_customer_roles`
- [ ] New user can login via Keycloak
- [ ] New user can access tenant-scoped data (contacts, freight, books) — sees only their tenant's data
- [ ] Other tenants' data is not visible

### Dedicated Tenant Provisioning

- [ ] Create a new dedicated tenant with `dbStrategy: "dedicated"`
- [ ] Workflow creates `{tenant_code}_db` database
- [ ] Workflow creates all 10 tables in the new database
- [ ] Workflow seeds access control data (no `tenant_uid` filtering needed)
- [ ] Workflow creates branch and app_customer in `admin_db`
- [ ] Workflow creates Keycloak user and syncs `keycloak_sub`
- [ ] New user can login and see data only from their dedicated database

### Data Isolation

- [ ] Shared tenant A cannot see shared tenant B's data
- [ ] Dedicated tenant cannot see shared tenants' data
- [ ] Shared tenants cannot see dedicated tenant's data

### Error Recovery

- [ ] If Keycloak is down, workflow retries and eventually succeeds
- [ ] If database creation fails, workflow compensates properly
- [ ] Workflow is idempotent — re-running on the same tenant doesn't create duplicates

---

## Quick Start for Temporal Developers

1. Read this document fully
2. Review `scripts/setup-enterprise-tenant.js` — this is the most complete reference
3. Review `scripts/setup-multi-tenant.js` — shows the shared tenant flow
4. Open `docs/CargoEz-Database-Schema.xlsx` to understand table schemas
5. Start Keycloak, PostgreSQL, and admin-service
6. Test the provisioning flow manually using the scripts
7. Convert each script section into a Temporal activity
8. Wire activities into a Temporal workflow with retry policies and compensation

---

## Contact

For questions about the existing architecture, refer to:

- [README.md](README.md) — Project overview and how to run
- [AUTHENTICATION.md](AUTHENTICATION.md) — Keycloak setup and guard pipeline
- [RBAC-ABAC.md](RBAC-ABAC.md) — Permission system details
- [DEVELOPMENT.md](DEVELOPMENT.md) — Coding conventions and architecture patterns
