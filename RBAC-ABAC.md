# RBAC + ABAC Permission System

Hierarchical **Role-Based Access Control** (RBAC) with **Attribute-Based Access Control** (ABAC) conditions, following the `Role.Module.Screen.Operation` pattern.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  auth-service :3002 (auth_db)                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Tables: roles, modules, screens, operations,               ││
│  │         permissions, role_permissions (with ABAC conditions)││
│  │ APIs:   CRUD + /resolve-permissions + /me/permissions      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
        ▲                                        ▲
        │ cache miss (HTTP)                      │ /me/permissions
        │                                        │
┌───────┴────────────────────────────────────────┴────────────────┐
│  @cargoez/infrastructure (shared library)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐│
│  │PermissionsGua│ │PermissionCach│ │AbacEvaluator             ││
│  │rd            │ │e (5-min TTL) │ │(tenant, ownership, dept, ││
│  │              │ │              │ │ time, custom rules)       ││
│  └──────────────┘ └──────────────┘ └──────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
        ▲
        │ import AuthModule
        │
┌───────┴─────────────────────────────────────────────────────────┐
│  All Services (user-service, auth-service, future...)            │
│  @RequirePermission('module.screen.operation')                  │
│  BaseRepository auto-applies ABAC filters (tenant_id, etc.)    │
└─────────────────────────────────────────────────────────────────┘
```

## Permission String Format

```
{module}.{screen}.{operation}
```

**Examples:**
- `user-management.users.read`
- `user-management.users.create`
- `contacts.contact-list.update`
- `freight.shipments.approve`
- `settings.general.delete`

---

## Database Schema (auth_db)

### Tables

| Table | Key Columns | Description |
|---|---|---|
| `roles` | `id`, `name` (unique), `description`, `is_system`, `is_active` | System and custom roles |
| `modules` | `id`, `code` (unique), `name`, `icon`, `sort_order`, `is_active` | Application modules (e.g., user-management) |
| `screens` | `id`, `module_id` (FK), `code`, `name`, `sort_order`, `is_active` | Screens within modules (unique per module) |
| `operations` | `id`, `code` (unique), `name`, `description` | Operation types (read, create, update, delete, etc.) |
| `permissions` | `id`, `module_id`, `screen_id`, `operation_id`, `permission_key` (unique) | Computed permission keys (module.screen.operation) |
| `role_permissions` | `id`, `role_id`, `permission_id`, `conditions` (JSONB) | Maps roles to permissions with optional ABAC conditions |

All tables include audit columns: `created_at`, `modified_at`, `created_by`, `modified_by`, `tenant_id`.

### Entity Relationship

```
roles ──┐
        ├── role_permissions (conditions JSONB)
permissions ──┘
        │
        ├── modules
        ├── screens (belongs to module)
        └── operations
```

---

## Default Seed Data

### Roles

| Role | Description | System? |
|---|---|---|
| `super-admin` | Full system access, no restrictions | Yes |
| `admin` | Full CRUD on all modules, tenant isolation | Yes |
| `manager` | Read + Update on all modules, tenant isolation | Yes |
| `user` | Read on all modules, ownership-based updates | Yes |
| `viewer` | Read-only on all modules, tenant isolation | Yes |

### Operations

`read`, `create`, `update`, `delete`, `export`, `import`, `approve`, `reject`

### Modules & Screens

| Module | Screens |
|---|---|
| `user-management` | users, roles, permissions |
| `contacts` | contact-list, contact-detail |
| `freight` | shipment-list, shipment-detail |
| `books` | book-list, book-detail |
| `settings` | general, integrations |

### Role → Permission Mappings

| Role | Permissions | ABAC Conditions |
|---|---|---|
| `super-admin` | All CRUD on all modules | None (unrestricted) |
| `admin` | All CRUD on all modules | `{ tenant_isolation: true }` |
| `manager` | Read + Update on all modules | `{ tenant_isolation: true }` |
| `user` | Read on all modules; Update with ownership | `{ tenant_isolation: true }` / `{ tenant_isolation: true, ownership_only: true }` |
| `viewer` | Read-only on all modules | `{ tenant_isolation: true }` |

---

## ABAC Conditions (JSONB)

ABAC conditions are stored as JSONB on `role_permissions.conditions`. When a user's permission is checked, the `AbacEvaluator` evaluates these conditions against the request context.

```json
{
  "tenant_isolation": true,
  "ownership_only": true,
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
| `tenant_isolation: true` | BaseRepository auto-adds `WHERE tenant_id = :userTenantId` |
| `ownership_only: true` | BaseRepository auto-adds `WHERE created_by = :userId` (for update/delete) |
| `department: [...]` | Request denied if user's department not in the list |
| `max_amount: N` | Request denied if `amount`/`total` in body exceeds N |
| `time_window: {from, to}` | Request denied if current time is outside the window |
| `custom_rules: [...]` | Arbitrary field-level rules (`eq`, `ne`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`) |

---

## API Endpoints (auth-service)

Base URL: `http://localhost:4000/auth-service` (via API Portal) or `http://localhost:3002/auth-service` (direct)

### Roles

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/roles` | Bearer token | List roles (paginated) |
| GET | `/roles/:id` | Bearer token | Get role by ID |
| POST | `/roles` | `@RequirePermission('user-management.roles.create')` | Create role |
| PUT | `/roles/:id` | `@RequirePermission('user-management.roles.update')` | Update role |
| DELETE | `/roles/:id` | `@RequirePermission('user-management.roles.delete')` | Delete role (system roles protected) |

### Modules

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/modules` | Bearer token | List modules (paginated, sorted by sortOrder) |
| POST | `/modules` | `@RequirePermission('user-management.permissions.create')` | Create module |
| PUT | `/modules/:id` | `@RequirePermission('user-management.permissions.update')` | Update module |
| DELETE | `/modules/:id` | `@RequirePermission('user-management.permissions.delete')` | Delete module |

### Screens

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/screens?moduleId=UUID` | Bearer token | List screens by module |
| POST | `/screens` | `@RequirePermission('user-management.permissions.create')` | Create screen |
| PUT | `/screens/:id` | `@RequirePermission('user-management.permissions.update')` | Update screen |
| DELETE | `/screens/:id` | `@RequirePermission('user-management.permissions.delete')` | Delete screen |

### Operations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/operations` | Bearer token | List operations |
| POST | `/operations` | `@RequirePermission('user-management.permissions.create')` | Create operation |

### Permissions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/permissions` | Bearer token | List all permission mappings |
| POST | `/permissions` | `@RequirePermission('user-management.permissions.create')` | Create permission (module + screen + operation) |
| DELETE | `/permissions/:id` | `@RequirePermission('user-management.permissions.delete')` | Delete permission |

### Role Permission Assignments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/roles/:id/permissions` | Bearer token | Get permissions for a role |
| POST | `/roles/:id/permissions` | `@RequirePermission('user-management.permissions.create')` | Assign permission to role (with ABAC conditions) |
| DELETE | `/roles/:roleId/permissions/:permId` | `@RequirePermission('user-management.permissions.delete')` | Revoke permission from role |

### Permission Resolution

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/resolve-permissions?roles=admin,manager` | Public | Resolve effective permissions for given roles (used by PermissionsGuard) |
| GET | `/me/permissions` | Bearer token | Get current user's permissions structured for frontend UI |

### Example: Resolve Permissions

```bash
GET /auth-service/resolve-permissions?roles=admin,manager
```

Response:
```json
{
  "success": true,
  "messageCode": "FETCHED",
  "message": "Resource fetched successfully",
  "data": {
    "permissions": [
      { "key": "user-management.users.read", "conditions": null },
      { "key": "user-management.users.create", "conditions": { "tenant_isolation": true } }
    ]
  }
}
```

### Example: My Permissions (Frontend)

```bash
GET /auth-service/me/permissions
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "messageCode": "FETCHED",
  "message": "Resource fetched successfully",
  "data": {
    "roles": ["admin"],
    "modules": [
      {
        "code": "user-management",
        "name": "User Management",
        "icon": "users",
        "screens": [
          { "code": "users", "name": "Users", "operations": ["create", "delete", "read", "update"] },
          { "code": "roles", "name": "Roles", "operations": ["create", "delete", "read", "update"] }
        ]
      }
    ]
  }
}
```

The frontend uses this to: render sidebar menus (modules), show/hide screens, enable/disable buttons (operations).

---

## Usage in Controllers

### Using @RequirePermission() (Pure ABAC — Recommended)

`@RequirePermission()` is the sole authorization mechanism for business operations. The auth-service database is the single source of truth. No `@Roles()` on individual methods.

```typescript
import { RequirePermission } from '@cargoez/infrastructure';

@Controller('users')
export class UsersController {
  @Get()
  findAll() { ... }  // Any authenticated user (no decorator needed)

  @Post()
  @RequirePermission('user-management.users.create')
  create(@Body() dto: CreateUserDto) { ... }

  @Put(':id')
  @RequirePermission('user-management.users.update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) { ... }

  @Delete(':id')
  @RequirePermission('user-management.users.delete')
  remove(@Param('id') id: string) { ... }
}
```

### When to use @Roles()

`@Roles()` is reserved for **area-level segregation** — entire controllers that only certain user types should ever access. It should NOT be used on individual CRUD methods (that's what `@RequirePermission` is for).

```typescript
@Controller('system/diagnostics')
@Roles('super-admin')  // Hardcoded: only super-admin can access this entire area
export class DiagnosticsController { ... }
```

### Guard Execution Order

1. **JwtAuthGuard** — Validates JWT token via Keycloak JWKS (skipped on `@Public()`)
2. **RolesGuard** — Checks `@Roles()` decorator if present (area-level gate, no-op if absent)
3. **PermissionsGuard** — Checks `@RequirePermission()` decorator:
   - Extracts user roles from JWT
   - Resolves permissions via auth-service (cached for 5 minutes)
   - Evaluates ABAC conditions
   - Attaches `request.abacFilters` for BaseRepository

### BaseRepository ABAC Integration

When ABAC conditions produce filters (e.g., `tenant_isolation: true`), the `PermissionsGuard` attaches them to the request context. `BaseRepository` automatically applies these as WHERE clauses:

```sql
-- tenant_isolation: true
SELECT * FROM users WHERE ... AND tenant_id = 'user-tenant-id'

-- ownership_only: true (for update/delete)
UPDATE users SET ... WHERE id = :id AND created_by = 'user-id'
```

---

## Adding a New Module/Screen

1. Create the module, screen, and operations in auth-service:

```bash
# Create a new module
POST /auth-service/modules
{ "code": "inventory", "name": "Inventory", "icon": "box", "sortOrder": 6 }

# Create screens for the module
POST /auth-service/screens
{ "moduleId": "<module-uuid>", "code": "item-list", "name": "Item List", "sortOrder": 1 }

# Create permissions (module + screen + operation combinations)
POST /auth-service/permissions
{ "moduleId": "<module-uuid>", "screenId": "<screen-uuid>", "operationId": "<read-op-uuid>" }

# Assign permissions to roles
POST /auth-service/roles/<role-uuid>/permissions
{ "permissionId": "<perm-uuid>", "conditions": { "tenant_isolation": true } }
```

2. Use the permission key in your controller:

```typescript
@RequirePermission('inventory.item-list.create')
@Post()
create(@Body() dto: CreateItemDto) { ... }
```

---

## PermissionCache

The `PermissionCache` is an in-memory cache that avoids calling auth-service on every request:

- **Key:** Sorted role names joined by comma (e.g., `admin,user`)
- **TTL:** 5 minutes
- **Invalidation:** `PermissionCache.invalidate()` clears all, `PermissionCache.invalidateForRoles(['admin'])` clears entries containing that role

To invalidate the cache programmatically (e.g., after updating role permissions):

```typescript
import { PermissionCache } from '@cargoez/infrastructure';
PermissionCache.invalidate();
```

---

## Complete Endpoint Security Matrix

Every request passes through three global guards (registered via `AuthModule`):

1. **JwtAuthGuard** — validates JWT; skipped on `@Public()` endpoints
2. **RolesGuard** — checks `@Roles()` for Keycloak realm roles; no-op if no roles required
3. **PermissionsGuard** — checks `@RequirePermission()` for ABAC permissions; no-op if no permission required

### user-service Endpoints

| Method | Endpoint | @Public | @RequirePermission | Effective Access |
|--------|----------|---------|-------------------|-----------------|
| GET | `/health` | Yes | — | Anyone |
| GET | `/users` | — | — | Any authenticated user |
| GET | `/users/me` | — | — | Any authenticated user |
| GET | `/users/:id` | — | — | Any authenticated user |
| POST | `/users` | — | `user-management.users.create` | ABAC-controlled |
| PUT | `/users/:id` | — | `user-management.users.update` | ABAC-controlled |
| DELETE | `/users/:id` | — | `user-management.users.delete` | ABAC-controlled |

### auth-service Endpoints

| Method | Endpoint | @Public | @RequirePermission | Effective Access |
|--------|----------|---------|-------------------|-----------------|
| GET | `/health` | Yes | — | Anyone |
| GET | `/roles` | — | — | Any authenticated user |
| GET | `/roles/:id` | — | — | Any authenticated user |
| POST | `/roles` | — | `user-management.roles.create` | ABAC-controlled |
| PUT | `/roles/:id` | — | `user-management.roles.update` | ABAC-controlled |
| DELETE | `/roles/:id` | — | `user-management.roles.delete` | ABAC-controlled |
| GET | `/modules` | — | — | Any authenticated user |
| POST | `/modules` | — | `user-management.permissions.create` | ABAC-controlled |
| PUT | `/modules/:id` | — | `user-management.permissions.update` | ABAC-controlled |
| DELETE | `/modules/:id` | — | `user-management.permissions.delete` | ABAC-controlled |
| GET | `/screens?moduleId=` | — | — | Any authenticated user |
| POST | `/screens` | — | `user-management.permissions.create` | ABAC-controlled |
| PUT | `/screens/:id` | — | `user-management.permissions.update` | ABAC-controlled |
| DELETE | `/screens/:id` | — | `user-management.permissions.delete` | ABAC-controlled |
| GET | `/operations` | — | — | Any authenticated user |
| POST | `/operations` | — | `user-management.permissions.create` | ABAC-controlled |
| GET | `/permissions` | — | — | Any authenticated user |
| POST | `/permissions` | — | `user-management.permissions.create` | ABAC-controlled |
| DELETE | `/permissions/:id` | — | `user-management.permissions.delete` | ABAC-controlled |
| GET | `/roles/:id/permissions` | — | — | Any authenticated user |
| POST | `/roles/:id/permissions` | — | `user-management.permissions.create` | ABAC-controlled |
| DELETE | `/roles/:rId/permissions/:pId` | — | `user-management.permissions.delete` | ABAC-controlled |
| GET | `/resolve-permissions` | Yes | — | Anyone (internal use) |
| GET | `/me/permissions` | — | — | Any authenticated user |

### Security Summary

| Category | Count |
|----------|-------|
| Public endpoints (no JWT required) | 3 |
| JWT-only endpoints (any authenticated user) | 6 |
| Endpoints with `@RequirePermission` (ABAC) | 18 |

> **Architecture:** All write endpoints use `@RequirePermission()` as the sole authorization mechanism. The auth-service database (role → permission mappings) is the single source of truth. No `@Roles()` is used on individual methods. Keycloak provides authentication and role identity; auth-service ABAC controls authorization.

---

## Frontend Permission System

The frontend uses the `@rajkumarganesan93/auth` package to enforce permission-aware UI. This is a **cosmetic enforcement** layer — the backend guards are the actual security boundary.

### Package: `@rajkumarganesan93/auth`

#### Components & Hooks

| Export | Type | Purpose |
|--------|------|---------|
| `PermissionProvider` | Component | Fetches and caches user permissions; wraps the app |
| `usePermissions()` | Hook | Returns `{ can, canAny, loading, permissions, refresh }` |
| `PermissionGate` | Component | Declarative conditional rendering based on permissions |
| `PermissionData` | Type | `{ roles: string[], modules: PermissionModule[] }` |
| `PermissionModule` | Type | `{ code, name, icon, screens: PermissionScreen[] }` |
| `PermissionScreen` | Type | `{ code, name, operations: string[] }` |

#### PermissionProvider

Accepts a `fetcher` prop (async function) to stay decoupled from the API client:

```tsx
import { PermissionProvider } from '@rajkumarganesan93/auth';
import { api } from '@rajkumarganesan93/uifunctions';

const fetcher = async () => {
  const res = await api.get('/auth-service/me/permissions');
  return res.data.data;  // PermissionData
};

<PermissionProvider fetcher={fetcher}>
  <App />
</PermissionProvider>
```

Internally, it builds a `Set<string>` lookup of `module.screen.operation` keys for O(1) permission checks.

#### usePermissions()

```tsx
const { can, canAny, loading } = usePermissions();

can('create', 'user-management', 'users');     // boolean
canAny(['create', 'update'], 'user-management', 'users'); // boolean
```

#### PermissionGate

```tsx
<PermissionGate module="user-management" screen="users" operation="create">
  <Button label="Create User" />
</PermissionGate>

<PermissionGate module="user-management" screen="users" operation={['create', 'update']}>
  <Button label="Save" />
</PermissionGate>
```

### Admin Panel: Page-to-Permission Mapping

Each admin page checks permissions using `usePermissions().can()` to conditionally show/hide action buttons:

| Admin Page | Module | Screen | create | update | delete | Gated UI Elements |
|------------|--------|--------|--------|--------|--------|-------------------|
| User Management | `user-management` | `users` | Create User | Edit | Delete | Header button, row buttons |
| Role Management | `user-management` | `roles` | Create Role | Edit | Delete | Header button, row buttons |
| Module Management | `user-management` | `permissions` | Create Module | Edit | Delete | Header button, row buttons |
| Screen Management | `user-management` | `permissions` | Create Screen | Edit | Delete | Header button, row buttons |
| Operation Management | `user-management` | `permissions` | Create Operation | — | — | Header button only |
| Permission Management | `user-management` | `permissions` | Create Permission | — | Delete | Header button, row button |
| Role Permission Mgmt | `user-management` | `permissions` | Assign Permission | — | Revoke | Action buttons |

> **Why `permissions` screen for Modules/Screens/Operations/RolePermissions?**
> These pages manage the building blocks of the permission system itself. They share the `user-management.permissions` screen permission because they are sub-features of permission management. The database has 3 screens under `user-management`: `users`, `roles`, `permissions`.

### What is NOT gated (always visible)

- Table/list views (read data)
- Search and pagination controls
- "My Permissions" tab in Role Permissions page
- Sidebar navigation links

---

## User-to-Permission Matrix

### Keycloak Users & Realm Roles

| Username | Password | Keycloak Roles | Purpose |
|----------|----------|----------------|---------|
| `admin` | `admin123` | `admin`, `user` | Full administrative access |
| `manager` | `manager123` | `manager`, `user` | Read + Update only |
| `testuser` | `test123` | `user` | Read-only access |

### ABAC Permission Assignments

| Auth-Service Role | Permission Count | Operations | ABAC Conditions |
|-------------------|-----------------|------------|-----------------|
| `admin` | 44 | create, read, update, delete (all screens) | `{ tenant_isolation: true }` |
| `manager` | 22 | read, update (all screens) | `{ tenant_isolation: true }` |
| `user` | 11 | read (all screens) | `{ tenant_isolation: true }` |

### Effective Access per User

Since users can have multiple Keycloak roles, their effective permissions are the **union** of all role permissions:

| User | KC Roles | Auth Roles Resolved | Effective Permissions |
|------|----------|--------------------|-----------------------|
| `admin` | admin, user | admin (44) + user (11) | 44 unique (admin superset of user) |
| `manager` | manager, user | manager (22) + user (11) | 22 unique (manager superset of user) |
| `testuser` | user | user (11) | 11 unique (read-only) |

### Per-Screen Breakdown

| Module.Screen | admin | manager | testuser |
|---------------|-------|---------|----------|
| `user-management.users` | CRUD | R, U | R |
| `user-management.roles` | CRUD | R, U | R |
| `user-management.permissions` | CRUD | R, U | R |
| `contacts.contact-list` | CRUD | R, U | R |
| `contacts.contact-detail` | CRUD | R, U | R |
| `freight.shipment-list` | CRUD | R, U | R |
| `freight.shipment-detail` | CRUD | R, U | R |
| `books.book-list` | CRUD | R, U | R |
| `books.book-detail` | CRUD | R, U | R |
| `settings.general` | CRUD | R, U | R |
| `settings.integrations` | CRUD | R, U | R |

> CRUD = Create, Read, Update, Delete; R = Read; U = Update

### UI Visibility per User

| Admin Page | admin sees | manager sees | testuser sees |
|------------|-----------|--------------|---------------|
| Users | Create + Edit + Delete | Edit only | Read-only table |
| Roles | Create + Edit + Delete | Edit only | Read-only table |
| Modules | Create + Edit + Delete | Edit only | Read-only table |
| Screens | Create + Edit + Delete | Edit only | Read-only table |
| Operations | Create | Read-only table | Read-only table |
| Permissions | Create + Delete | Read-only table | Read-only table |
| Role Permissions | Assign + Revoke | Read-only table | Read-only table |

---

## API Test Results (Verified)

Direct API calls confirm that the ABAC system correctly controls access based on permission assignments.

### admin (KC roles: `admin`, `user` — ABAC: full CRUD)

| API Call | HTTP Status | Result |
|----------|------------|--------|
| `GET /user-service/users` | **200** | Allowed |
| `POST /user-service/users` | **200** | Allowed — has `users.create` |
| `PUT /user-service/users/:id` | **200** | Allowed — has `users.update` |
| `GET /auth-service/roles` | **200** | Allowed |
| `POST /auth-service/roles` | **200** | Allowed — has `roles.create` |
| `GET /auth-service/modules` | **200** | Allowed |

### manager (KC roles: `manager`, `user` — ABAC: read + update)

| API Call | HTTP Status | Result |
|----------|------------|--------|
| `GET /user-service/users` | **200** | Allowed — has `users.read` |
| `POST /user-service/users` | **403** | Blocked — no `users.create` permission |
| `PUT /user-service/users/:id` | **200** | Allowed — has `users.update` permission |
| `GET /auth-service/roles` | **200** | Allowed — has `roles.read` |
| `POST /auth-service/roles` | **403** | Blocked — no `roles.create` permission |
| `POST /auth-service/modules` | **403** | Blocked — no `permissions.create` permission |

### testuser (KC roles: `user` — ABAC: read only)

| API Call | HTTP Status | Result |
|----------|------------|--------|
| `GET /user-service/users` | **200** | Allowed — has `users.read` |
| `POST /user-service/users` | **403** | Blocked — no `users.create` permission |
| `PUT /user-service/users/:id` | **403** | Blocked — no `users.update` permission |
| `GET /auth-service/roles` | **200** | Allowed — has `roles.read` |
| `POST /auth-service/roles` | **403** | Blocked — no `roles.create` permission |
| `POST /auth-service/modules` | **403** | Blocked — no `permissions.create` permission |

### How it works

The `PermissionsGuard` extracts Keycloak roles from the JWT, calls `/resolve-permissions?roles=manager,user`, and checks if the resolved permission set contains the required permission key. No `@Roles()` decorator is involved — the ABAC database is the sole decision-maker for business operations.
