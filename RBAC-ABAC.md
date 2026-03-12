# Pure ABAC Permission System

Attribute-Based Access Control with two-database authorization: `admin_db` for identity resolution and tenant DBs for permission evaluation. Permission keys follow the `module.operation` format.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  admin-service :3001                                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ admin_db (24 tables)                                           │ │
│  │ Identity: sys_admins, app_customers, tenants, branches         │ │
│  │ Mapping:  keycloak_sub → user → tenant → tenant DB config     │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ Tenant DBs (shared_db / tenant_code_db)                        │ │
│  │ Authorization: roles, permissions, role_permissions (ABAC)     │ │
│  │ API: /internal/resolve-context                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
        ▲
        │  resolve-context (cached 5 min)
        │
┌───────┴─────────────────────────────────────────────────────────────┐
│  @cargoez/infrastructure (shared library)                            │
│  ┌──────────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ContextInterceptor│  │PermissionCach│  │PermissionsGuard        │ │
│  │ (calls resolve-  │  │e (5-min TTL) │  │ + AbacEvaluator        │ │
│  │  context once)   │  │              │  │ (reads RequestContext) │ │
│  └──────────────────┘  └──────────────┘  └────────────────────────┘ │
└───────┬─────────────────────────────────────────────────────────────┘
        │  import AuthModule
        │
┌───────▼─────────────────────────────────────────────────────────────┐
│  All Services                                                        │
│  admin-service :3001  freight :3002  contacts :3003  books :3004    │
│  @RequirePermission('module.operation')                              │
│  TenantBaseRepository auto-applies ABAC filters                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Two-Database Authorization

The ABAC system spans two database tiers:

### admin_db (Identity — Central)

Managed by admin-service. Contains platform-wide tables (24 total):

| Table | Purpose |
|---|---|
| `sys_admins` | System admin accounts with `keycloak_sub` mapping |
| `app_customers` | Tenant user accounts with `keycloak_sub` mapping |
| `tenants` | Tenant registry with DB connection config (`db_strategy`: shared/dedicated) |
| `branches` | Tenant branches |
| `admin_roles` / `admin_permissions` / `admin_role_permissions` | SysAdmin-level ABAC for admin portal |
| `sys_admin_roles` | Maps sys_admins to admin_roles |
| `subscriptions` / `products` | Subscription and product management |
| `meta_data` / `meta_data_details` | System-level metadata (countries, tenant types) |

When a request arrives, admin-service uses `keycloak_sub` from the JWT to look up the user (in `sys_admins` or `app_customers`), find their tenant, and determine which tenant DB to query for permissions.

### Tenant DB (Authorization — Per-Tenant)

Each tenant DB (`shared_db` or `tenant_code_db`) contains the authorization tables:

| Table | Key Columns | Description |
|---|---|---|
| `modules` | `uid`, `code` (unique per tenant), `name`, `description`, `icon`, `sort_order` | Application modules/screens |
| `operations` | `uid`, `code` (unique per tenant), `name`, `description` | CRUD operations |
| `roles` | `uid`, `code` (unique per tenant), `name`, `description`, `is_system` | Tenant-specific roles |
| `permissions` | `uid`, `module_uid`, `operation_uid`, `permission_key` | Available permissions (module.operation) |
| `role_permissions` | `uid`, `role_uid`, `permission_uid`, `conditions` (JSONB), `granted_by` | Maps roles to permissions with ABAC conditions |
| `app_customer_roles` | `uid`, `app_customer_uid`, `role_uid` | Maps app_customers to roles within the tenant |
| `shipments` | Business data — freight shipments | Tenant-isolated business data |
| `contacts` | Business data — contact directory | Tenant-isolated business data |
| `invoices` / `invoice_items` | Business data — invoicing | Tenant-isolated business data |

All tables include BaseEntity columns: `uid`, `tenant_uid`, `is_active`, `created_at`, `modified_at`, `created_by`, `modified_by`.

### Authorization Flow

```
1. JWT arrives → JwtAuthGuard validates via Keycloak JWKS
2. ContextInterceptor extracts keycloak_sub
3. admin-service resolves: keycloak_sub → user → tenant → tenant DB
4. admin-service queries tenant DB: user_roles + role_permissions
5. Returns combined permissions to the calling service
6. PermissionsGuard checks @RequirePermission() from RequestContext
7. AbacEvaluator evaluates conditions, attaches filters
```

---

## Permission Key Format

```
{module}.{operation}
```

**Examples:**

| Permission Key | Module | Operation |
|---|---|---|
| `freight.create` | freight | create |
| `freight.read` | freight | read |
| `freight.update` | freight | update |
| `freight.delete` | freight | delete |
| `contacts.create` | contacts | create |
| `contacts.read` | contacts | read |
| `books.export` | books | export |
| `books.approve` | books | approve |

### Standard Operations

`read`, `create`, `update`, `delete`, `export`, `import`, `approve`, `reject`

---

## ABAC Conditions (JSONB)

ABAC conditions are stored as JSONB on `role_permissions.conditions`. When a permission is checked, the `AbacEvaluator` evaluates these conditions against the request context.

```json
{
  "tenant_isolation": true,
  "ownership_only": true,
  "branch_isolation": true,
  "department": ["sales", "logistics"],
  "max_amount": 10000,
  "time_window": { "from": "09:00", "to": "18:00" },
  "custom_rules": [
    { "field": "status", "operator": "in", "values": ["draft", "pending"] }
  ]
}
```

| Condition | Effect |
|---|---|
| `tenant_isolation: true` | Auto-adds `WHERE tenant_uid = :userTenantUid` to all queries |
| `ownership_only: true` | Auto-adds `WHERE created_by = :userId` for update/delete |
| `branch_isolation: true` | Auto-adds `WHERE branch_uid = :userBranchUid` |
| `department: [...]` | Request denied if user's department not in the list |
| `max_amount: N` | Request denied if `amount`/`total` in body exceeds N |
| `time_window: {from, to}` | Request denied if current time is outside the window |
| `custom_rules: [...]` | Arbitrary field-level rules (`eq`, `ne`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`) |

### AbacEvaluator

The `AbacEvaluator` in `@cargoez/infrastructure` processes conditions:

```typescript
import { AbacEvaluator } from '@cargoez/infrastructure';

// Internally called by PermissionsGuard:
const result = AbacEvaluator.evaluate(conditions, requestContext);
// result.allowed: boolean
// result.filters: { tenant_uid?: string, created_by?: string, branch_uid?: string }
```

When conditions produce filters, `PermissionsGuard` attaches them to `request.abacFilters`. `TenantBaseRepository` automatically applies these as WHERE clauses:

```sql
-- tenant_isolation: true
SELECT * FROM shipments WHERE ... AND tenant_uid = 'tenant-uuid'

-- ownership_only: true (for update/delete)
UPDATE shipments SET ... WHERE uid = :uid AND created_by = 'user-uuid'

-- branch_isolation: true
SELECT * FROM shipments WHERE ... AND branch_uid = 'branch-uuid'
```

---

## Usage in Controllers

### Protecting Endpoints with @RequirePermission()

`@RequirePermission()` is the sole authorization mechanism for all business operations. The tenant DB `role_permissions` table is the single source of truth.

```typescript
import { RequirePermission, Public } from '@cargoez/infrastructure';

@Controller('shipments')
export class ShipmentsController {
  @Get('health')
  @Public()                                    // No auth required
  health() { ... }

  @Get()
  findAll() { ... }                            // Any authenticated user

  @Post()
  @RequirePermission('freight.create')         // ABAC-controlled
  create(@Body() dto: CreateShipmentDto) { ... }

  @Put(':id')
  @RequirePermission('freight.update')         // ABAC-controlled
  update(@Param('id') id: string, @Body() dto: UpdateShipmentDto) { ... }

  @Delete(':id')
  @RequirePermission('freight.delete')         // ABAC-controlled
  remove(@Param('id') id: string) { ... }
}
```

### Example: Full Endpoint Protection

```typescript
// contacts-service: contacts.controller.ts
@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly createContact: CreateContactUseCase,
    private readonly getAllContacts: GetAllContactsUseCase,
    private readonly updateContact: UpdateContactUseCase,
    private readonly deleteContact: DeleteContactUseCase,
  ) {}

  @Get()
  async findAll(@Query('page') page: number, @Query('limit') limit: number) {
    const result = await this.getAllContacts.execute({ page, limit });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Post()
  @RequirePermission('contacts.create')
  async create(@Body() dto: CreateContactDto) {
    const contact = await this.createContact.execute(dto);
    return createSuccessResponse(MessageCode.CREATED, contact);
  }

  @Put(':id')
  @RequirePermission('contacts.update')
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    const contact = await this.updateContact.execute(id, dto);
    return createSuccessResponse(MessageCode.UPDATED, contact);
  }

  @Delete(':id')
  @RequirePermission('contacts.delete')
  async remove(@Param('id') id: string) {
    await this.deleteContact.execute(id);
    return createSuccessResponse(MessageCode.DELETED, null);
  }
}
```

---

## Guard Pipeline

Every request passes through three stages:

```
1. JwtAuthGuard        →  Validates JWT via Keycloak JWKS
                           Skipped on @Public() routes
                           Attaches decoded claims to request.user

2. ContextInterceptor  →  Calls /internal/resolve-context (cached 5 min)
                           Populates RequestContext: user, tenant, DB config, permissions

3. PermissionsGuard    →  Reads permissions from RequestContext (NO HTTP call)
                           Checks @RequirePermission('module.operation')
                           Evaluates ABAC conditions via AbacEvaluator
                           Attaches abacFilters to request context
```

**Key insight:** Only `ContextInterceptor` makes an HTTP call (to admin-service), and it's cached for 5 minutes. `PermissionsGuard` reads everything from the in-memory `RequestContext`.

---

## Tenant Provisioning

When a new tenant is created via admin-service, the provisioning process:

### 1. Create Tenant Record (admin_db)

```sql
INSERT INTO tenants (uid, code, name, db_host, db_port, db_name, ...)
VALUES ('uuid', 'acme', 'Acme Corp', 'localhost', 5432, 'tenant_acme_db', ...);
```

### 2. Create Tenant Database

```sql
CREATE DATABASE tenant_acme_db;
```

### 3. Run Migrations on Tenant DB

Creates all required tables including `roles`, `permissions`, `role_permissions`, `user_roles`, and all business tables.

### 4. Seed Default Roles and Permissions

The provisioning process creates default roles with standard permissions:

| Default Role | Permissions | ABAC Conditions |
|---|---|---|
| `tenant_admin` | All CRUD on all modules | `{ tenant_isolation: true }` |
| `manager` | Read + Update on all modules | `{ tenant_isolation: true }` |
| `user` | Read on all modules | `{ tenant_isolation: true }` |
| `viewer` | Read-only on all modules | `{ tenant_isolation: true }` |

### 5. Create Admin User Assignment

The tenant creator is assigned the `tenant_admin` role in the new tenant DB.

---

## Permission Cache

The resolve-context response (including permissions) is cached in-memory to minimize HTTP calls to admin-service.

| Parameter | Value |
|---|---|
| Cache key | `keycloak_sub` (from JWT) |
| TTL | 5 minutes |
| Scope | Per-service instance |
| Storage | In-memory |

### Invalidation

```typescript
import { PermissionCache } from '@cargoez/infrastructure';

PermissionCache.invalidate();                    // Clear all cached contexts
PermissionCache.invalidateForUser('kc-sub-id');  // Clear specific user
```

Invalidate after:
- Changing a user's role assignment
- Modifying role_permissions in the tenant DB
- Changing a user's tenant assignment

---

## Frontend Permission System

The frontend uses permissions returned by resolve-context (via a `/me/permissions` endpoint) to control UI visibility.

### Using usePermissions()

```tsx
const { can, canAny, loading } = usePermissions();

can('create', 'freight');                    // boolean
canAny(['create', 'update'], 'contacts');    // boolean
```

### PermissionGate Component

```tsx
<PermissionGate module="freight" operation="create">
  <Button label="Create Shipment" />
</PermissionGate>

<PermissionGate module="contacts" operation={['create', 'update']}>
  <Button label="Save Contact" />
</PermissionGate>
```

This is **cosmetic enforcement** only — the backend guards are the actual security boundary.

---

## Security Summary

| Layer | Mechanism | Source of Truth |
|---|---|---|
| Authentication | Keycloak JWKS (JwtAuthGuard) | Keycloak realm |
| Identity Resolution | resolve-context (ContextInterceptor) | admin_db |
| Authorization | @RequirePermission (PermissionsGuard) | Tenant DB role_permissions |
| Data Isolation | ABAC filters (TenantBaseRepository) | ABAC conditions JSONB |
| UI Enforcement | PermissionGate / usePermissions | Cosmetic only (backend is authority) |

**Architecture:** Keycloak provides authentication and role identity. admin-service maps the Keycloak identity to a tenant context. The tenant DB contains the ABAC permission rules. No `tenant_uid` in JWT — everything is resolved at runtime via admin-service.
