# CargoEz — Authentication & Authorization Guide

> Multi-tenant SaaS authentication using Keycloak (OAuth 2.0 / OIDC) with centralized identity resolution via admin-service. Covers backend developers, frontend developers, mobile developers, and API testers.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [How It Works](#2-how-it-works)
3. [Keycloak Setup](#3-keycloak-setup)
4. [Keycloak Clients](#4-keycloak-clients)
5. [Realm Roles](#5-realm-roles)
6. [resolve-context Flow](#6-resolve-context-flow)
7. [Permission Caching](#7-permission-caching)
8. [Getting Tokens (API Testing)](#8-getting-tokens-api-testing)
9. [Using Tokens in Swagger UI](#9-using-tokens-in-swagger-ui)
10. [Frontend Web Integration (PKCE)](#10-frontend-web-integration-pkce)
11. [Mobile App Integration (PKCE)](#11-mobile-app-integration-pkce)
12. [Token Anatomy](#12-token-anatomy)
13. [Token Refresh](#13-token-refresh)
14. [Backend Guard Pipeline](#14-backend-guard-pipeline)
15. [Route Protection Reference](#15-route-protection-reference)
16. [Error Responses](#16-error-responses)
17. [Environment Variables](#17-environment-variables)
18. [Security Best Practices](#18-security-best-practices)
19. [Troubleshooting](#19-troubleshooting)
20. [Glossary](#20-glossary)

---

## 1. Architecture Overview

```
                                ┌─────────────────────────────┐
                                │        Keycloak              │
                                │   (Identity Provider)        │
                                │   http://localhost:8080       │
                                │                              │
                                │  ┌────────────────────────┐  │
                                │  │   cargoez realm         │  │
                                │  │   ├── cargoez-admin     │  │  ← SysAdmin portal (PKCE)
                                │  │   └── cargoez-web       │  │  ← Tenant portal (PKCE)
                                │  └────────────────────────┘  │
                                └──────────────┬───────────────┘
                                               │
                                    JWT (access_token)
                                               │
              ┌────────────────────────────────┼──────────────────────────────┐
              ▼                                ▼                              ▼
   ┌──────────────────┐             ┌──────────────────┐          ┌──────────────────┐
   │ admin-service    │             │ freight-service  │          │ contacts / books │
   │ :3001            │◄────────────│ :3002            │          │ :3003 / :3004    │
   │                  │  resolve-   │                  │          │                  │
   │ ┌──────────────┐ │  context    │ ┌──────────────┐ │          │ ┌──────────────┐ │
   │ │ admin_db     │ │             │ │ JWKS verify  │ │          │ │ JWKS verify  │ │
   │ │ (users,      │ │             │ │ + resolve    │ │          │ │ + resolve    │ │
   │ │  tenants,    │ │             │ │   context    │ │          │ │   context    │ │
   │ │  roles,      │ │             │ └──────────────┘ │          │ └──────────────┘ │
   │ │  permissions)│ │             │ ┌──────────────┐ │          │ ┌──────────────┐ │
   │ └──────────────┘ │             │ │ Tenant DB    │ │          │ │ Tenant DB    │ │
   │                  │             │ │ (via Manager)│ │          │ │ (via Manager)│ │
   └──────────────────┘             │ └──────────────┘ │          │ └──────────────┘ │
                                    └──────────────────┘          └──────────────────┘
```

**Key Concepts:**

- **Keycloak** provides user identity (authentication) — passwords, SSO, PKCE flows
- **admin-service** provides authorization context — maps keycloak_sub to user identity, tenant, and permissions
- **JWT access tokens** are issued by Keycloak and verified by each service independently via JWKS
- **No tenant_uid in JWT** — tenant is resolved by admin-service from the keycloak_sub
- **resolve-context** is the single internal endpoint that combines user identity, DB connection, and permissions

---

## 2. How It Works

### Authentication Flow (All Services)

```
1. Client obtains JWT from Keycloak (via PKCE or ROPC)
2. Client sends:  Authorization: Bearer <JWT>
3. JwtAuthGuard validates JWT via Keycloak JWKS (cached 10 min)
4. ContextInterceptor calls admin-service /internal/resolve-context
   - Sends: keycloak_sub (from JWT)
   - Receives: user identity + tenant DB config + permissions
5. RequestContext populated with all resolved data
6. PermissionsGuard checks @RequirePermission() from RequestContext
7. Controller executes with full tenant context
```

### What Makes This Different

| Aspect | Old Architecture | New Architecture |
|---|---|---|
| Tenant identity | In JWT claim | Resolved via admin-service lookup |
| Permissions | HTTP call per guard check | Single resolve-context call, cached 5 min |
| DB connection | Static per service | Dynamic per tenant via TenantConnectionManager |
| Services | auth-service + user-service | admin-service (central) + domain services |

---

## 3. Keycloak Setup

### Option A: Docker

```bash
docker run -d --name keycloak \
  -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -v ./keycloak/cargoez-realm.json:/opt/keycloak/data/import/cargoez-realm.json \
  quay.io/keycloak/keycloak:26.1.0 start-dev --import-realm
```

### Option B: Standalone (Java 17+)

```bash
# Windows (PowerShell)
$env:KEYCLOAK_ADMIN = "admin"
$env:KEYCLOAK_ADMIN_PASSWORD = "admin"
.\keycloak-26.1.0\bin\kc.bat start-dev --import-realm --http-port=8080

# Linux / macOS
export KEYCLOAK_ADMIN=admin
export KEYCLOAK_ADMIN_PASSWORD=admin
./keycloak-26.1.0/bin/kc.sh start-dev --import-realm --http-port=8080
```

Place `keycloak/cargoez-realm.json` into Keycloak's `data/import/` folder before starting.

### Keycloak Admin Console

| URL | Credentials | Purpose |
|-----|-------------|---------|
| http://localhost:8080/admin | `admin` / `admin` | Manage realm, users, roles, clients |

---

## 4. Keycloak Clients

The `cargoez` realm has 2 clients, one per frontend portal:

### cargoez-admin (SysAdmin Portal)

| Setting | Value |
|---------|-------|
| Client ID | `cargoez-admin` |
| Type | Public (no secret) |
| Grant Type | Authorization Code + PKCE (S256) |
| PKCE Enforcement | Required (S256 only) |
| Redirect URIs | `https://admin.cargoez.com/*`, `http://localhost:5177/*` |
| Use For | SysAdmin portal — platform management, tenant provisioning |

### cargoez-web (Tenant Portal)

| Setting | Value |
|---------|-------|
| Client ID | `cargoez-web` |
| Type | Public (no secret) |
| Grant Type | Authorization Code + PKCE (S256) |
| PKCE Enforcement | Required (S256 only) |
| Redirect URIs | `https://app.cargoez.com/*`, `http://localhost:5173/*` through `http://localhost:5176/*` |
| Use For | Tenant application — freight, contacts, books |

---

## 5. Realm Roles

Keycloak realm roles define the user's identity type. They do **not** control granular permissions — that's handled by the ABAC system in the tenant DB.

| Role | Description | Portal |
|------|-------------|--------|
| `sys_admin` | System administrator — full platform access | admin.cargoez.com |
| `tenant_admin` | Tenant administrator — full access within their tenant | app.cargoez.com |
| `app_customer` | Standard application user | app.cargoez.com |
| `branch_customer` | Branch-level user (limited to their branch) | app.cargoez.com |

### Role-to-Portal Mapping

| Role | admin.cargoez.com | app.cargoez.com |
|------|-------------------|-----------------|
| `sys_admin` | Full access | N/A |
| `tenant_admin` | N/A | Full tenant access |
| `app_customer` | N/A | Standard access |
| `branch_customer` | N/A | Branch-scoped access |

---

## 6. resolve-context Flow

This is the core of the multi-tenant authentication system. A single internal endpoint replaces what previously required multiple service calls.

### Endpoint

```
GET /internal/resolve-context
Headers: Authorization: Bearer <JWT>
```

### Flow

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Any Service  │     │  admin-service   │     │   admin_db   │
│              │     │                  │     │              │
│ Intercept    │     │                  │     │              │
│ request      │     │                  │     │              │
│     │        │     │                  │     │              │
│     ▼        │     │                  │     │              │
│ Extract      │     │                  │     │              │
│ keycloak_sub │     │                  │     │              │
│ from JWT     │     │                  │     │              │
│     │        │     │                  │     │              │
│     ├────────┼────►│ 1. Lookup user   │────►│ users table  │
│     │        │     │    by kc_sub     │◄────│ (keycloak_sub│
│     │        │     │                  │     │  → user_uid) │
│     │        │     │ 2. Get tenant    │────►│ tenants tbl  │
│     │        │     │    info + DB cfg │◄────│ (tenant_code │
│     │        │     │                  │     │  → DB config)│
│     │        │     │ 3. Get perms     │     │              │
│     │        │     │    from tenant DB│     │              │
│     │        │     │    (role_perms)  │     │              │
│     │        │     │                  │     │              │
│     │◄───────┼─────│ Return combined  │     │              │
│     │        │     │ context          │     │              │
│     ▼        │     │                  │     │              │
│ Populate     │     │                  │     │              │
│ RequestCtx   │     │                  │     │              │
└──────────────┘     └──────────────────┘     └──────────────┘
```

### Response Shape

```json
{
  "user": {
    "uid": "user-uuid",
    "email": "user@acme.com",
    "keycloak_sub": "kc-uuid",
    "tenant_uid": "tenant-uuid",
    "tenant_code": "acme"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "tenant_acme_db"
  },
  "permissions": [
    { "key": "freight.create", "conditions": { "tenant_isolation": true } },
    { "key": "freight.read", "conditions": null },
    { "key": "contacts.read", "conditions": null }
  ]
}
```

### Why No tenant_uid in JWT?

- JWTs are issued by Keycloak, which doesn't know about CargoEz tenants
- A user might belong to different tenants (multi-tenant membership)
- Tenant assignment can change without re-issuing a JWT
- admin-service is the single source of truth for user-to-tenant mapping

---

## 7. Permission Caching

The resolve-context response is cached to avoid calling admin-service on every request.

| Parameter | Value |
|---|---|
| Cache key | `keycloak_sub` (from JWT) |
| TTL | 5 minutes |
| Scope | Per-service instance (in-memory) |
| Invalidation | Automatic TTL expiry; manual via `PermissionCache.invalidate()` |

### Cache Behavior

```
Request 1 (user A):  Cache MISS → call resolve-context → cache result
Request 2 (user A):  Cache HIT  → use cached context (no HTTP call)
...
Request N (user A):  Cache HIT  → use cached context
After 5 min:         Cache EXPIRED → call resolve-context again
```

### Manual Invalidation

After updating roles/permissions in admin-service, invalidate the cache:

```typescript
import { PermissionCache } from '@cargoez/infrastructure';

PermissionCache.invalidate();                    // Clear all
PermissionCache.invalidateForUser('kc-sub-id');  // Clear specific user
```

---

## 8. Getting Tokens (API Testing)

### curl (Linux / macOS / Git Bash)

```bash
# Get token using ROPC (for API testing)
TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/cargoez/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=cargoez-web&username=admin&password=admin123" \
  | jq -r '.access_token')

# Use token
curl -H "Authorization: Bearer $TOKEN" http://localhost:3002/freight-service/shipments
```

### PowerShell (Windows)

```powershell
$body = @{
  grant_type = "password"
  client_id  = "cargoez-web"
  username   = "admin"
  password   = "admin123"
}
$token = (Invoke-RestMethod `
  -Uri "http://localhost:8080/realms/cargoez/protocol/openid-connect/token" `
  -Method POST -Body $body `
  -ContentType "application/x-www-form-urlencoded").access_token

Invoke-RestMethod -Uri "http://localhost:3002/freight-service/shipments" `
  -Headers @{ Authorization = "Bearer $token" }
```

### Postman Auto-Token (Pre-request Script)

```javascript
const tokenUrl = 'http://localhost:8080/realms/cargoez/protocol/openid-connect/token';

pm.sendRequest({
  url: tokenUrl,
  method: 'POST',
  header: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: {
    mode: 'urlencoded',
    urlencoded: [
      { key: 'grant_type', value: 'password' },
      { key: 'client_id', value: 'cargoez-web' },
      { key: 'username', value: 'admin' },
      { key: 'password', value: 'admin123' },
    ]
  }
}, (err, res) => {
  if (!err) {
    pm.collectionVariables.set('access_token', res.json().access_token);
  }
});
```

Set collection Authorization to: **Bearer Token** -> `{{access_token}}`

---

## 9. Using Tokens in Swagger UI

1. Get a token using curl, PowerShell, or Postman (see above)
2. Open a service's Swagger UI (e.g., http://localhost:3002/freight-service/api-docs)
3. Click **"Authorize"** (lock icon)
4. Paste the `access_token` value (without `Bearer ` prefix)
5. Click **"Authorize"**, then **"Close"**

---

## 10. Frontend Web Integration (PKCE)

### SysAdmin Portal (admin.cargoez.com)

```typescript
export const oidcConfig = {
  authority: 'http://localhost:8080/realms/cargoez',
  client_id: 'cargoez-admin',
  redirect_uri: 'http://localhost:5177/auth/callback',
  post_logout_redirect_uri: 'http://localhost:5177',
  response_type: 'code',
  scope: 'openid profile email',
};
```

### Tenant Portal (app.cargoez.com)

```typescript
export const oidcConfig = {
  authority: 'http://localhost:8080/realms/cargoez',
  client_id: 'cargoez-web',
  redirect_uri: 'http://localhost:5173/auth/callback',
  post_logout_redirect_uri: 'http://localhost:5173',
  response_type: 'code',
  scope: 'openid profile email',
};
```

### React Example (using `oidc-client-ts` + `react-oidc-context`)

```tsx
import { AuthProvider } from 'react-oidc-context';
import { oidcConfig } from './auth/config';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider {...oidcConfig}>
    <App />
  </AuthProvider>
);
```

```tsx
import { useAuth } from 'react-oidc-context';

function App() {
  const auth = useAuth();

  if (auth.isLoading) return <div>Loading...</div>;
  if (!auth.isAuthenticated) {
    return <button onClick={() => auth.signinRedirect()}>Log in</button>;
  }

  return (
    <div>
      <p>Welcome, {auth.user?.profile.preferred_username}</p>
      <button onClick={() => auth.removeUser()}>Log out</button>
    </div>
  );
}
```

### Making API Calls

```typescript
export function useApiClient() {
  const auth = useAuth();

  return {
    async get(url: string) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${auth.user?.access_token}` },
      });
      return response.json();
    },
  };
}
```

---

## 11. Mobile App Integration (PKCE)

Mobile apps use Authorization Code + PKCE with deep links:

```typescript
import { authorize } from 'react-native-app-auth';

const config = {
  issuer: 'http://localhost:8080/realms/cargoez',
  clientId: 'cargoez-web',
  redirectUrl: 'cargoez://callback',
  scopes: ['openid', 'profile', 'email'],
  usePKCE: true,
};

export async function login() {
  const result = await authorize(config);
  return { accessToken: result.accessToken, refreshToken: result.refreshToken };
}
```

---

## 12. Token Anatomy

A decoded JWT access token from Keycloak:

```json
{
  "exp": 1740553200,
  "iat": 1740552900,
  "iss": "http://localhost:8080/realms/cargoez",
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "typ": "Bearer",
  "azp": "cargoez-web",
  "preferred_username": "john.doe",
  "email": "john@acme.com",
  "name": "John Doe",
  "realm_access": {
    "roles": ["tenant_admin", "app_customer"]
  },
  "scope": "openid profile email"
}
```

**Important:** The JWT does **not** contain `tenant_uid` or permissions. These are resolved by admin-service via the `sub` (keycloak_sub) claim.

| Field | Description |
|-------|-------------|
| `sub` | Keycloak user ID — used to look up user in admin_db |
| `azp` | Authorized party — which client requested the token |
| `realm_access.roles` | Realm roles: `sys_admin`, `tenant_admin`, `app_customer`, `branch_customer` |
| `exp` | Token expiry — 300 seconds (5 min) from issue |

### What the Backend Checks (JwtAuthGuard)

1. **Signature** — using Keycloak's RSA public key (fetched via JWKS, cached 10 min)
2. **Algorithm** — must be RS256
3. **Issuer** — must match `KEYCLOAK_ISSUER`
4. **Expiry** — token must not be expired

---

## 13. Token Refresh

Access tokens expire after **5 minutes**. Use the refresh token to get a new one:

```bash
curl -s -X POST \
  http://localhost:8080/realms/cargoez/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "client_id=cargoez-web" \
  -d "refresh_token=<YOUR_REFRESH_TOKEN>"
```

Frontend libraries (`oidc-client-ts`, `react-native-app-auth`) handle refresh automatically.

| Token | Lifespan |
|-------|----------|
| Access Token | 5 minutes (300 seconds) |
| Refresh Token | 30 minutes (1800 seconds) |
| SSO Session | 10 hours (36000 seconds) |

---

## 14. Backend Guard Pipeline

Every request passes through three stages:

```
1. JwtAuthGuard        →  Validates JWT via Keycloak JWKS (skipped on @Public())
2. ContextInterceptor  →  Calls /internal/resolve-context (cached 5 min)
                           Populates RequestContext with user, tenant, permissions
3. PermissionsGuard    →  Checks @RequirePermission() from RequestContext (no HTTP call)
                           Evaluates ABAC conditions, attaches filters
```

### AuthModule

Imported in each service's `AppModule` to register global guards:

```typescript
@Module({
  imports: [
    DatabaseModule.forRoot({ connectionPrefix: 'FREIGHT_SERVICE' }),
    AuthModule,
    RealtimeModule,
    ShipmentsModule,
  ],
})
export class AppModule {}
```

### Decorators

```typescript
@Public()                                 // Skip JWT verification
@RequirePermission('freight.create')      // ABAC-controlled (primary authorization)
```

---

## 15. Route Protection Reference

```typescript
@Controller('shipments')
export class ShipmentsController {
  @Get('health')
  @Public()                                    // No auth required
  health() { ... }

  @Get()                                       // Any authenticated user
  findAll() { ... }

  @Post()
  @RequirePermission('freight.create')         // ABAC-controlled
  create(@Body() dto) { ... }

  @Put(':id')
  @RequirePermission('freight.update')         // ABAC-controlled
  update(@Param('id') id, @Body() dto) { ... }

  @Delete(':id')
  @RequirePermission('freight.delete')         // ABAC-controlled
  remove(@Param('id') id) { ... }
}
```

---

## 16. Error Responses

### Authentication Errors (401)

```json
{
  "success": false,
  "messageCode": "UNAUTHORIZED",
  "error": "Authentication required",
  "statusCode": 401
}
```

### Authorization Errors (403)

```json
{
  "success": false,
  "messageCode": "FORBIDDEN",
  "error": "You do not have permission to perform this action",
  "statusCode": 403
}
```

### Frontend Error Handling

```typescript
async function apiCall(url: string, options: RequestInit) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    auth.signinRedirect(); // Token expired — re-login
    return;
  }
  if (response.status === 403) {
    showError('You do not have permission for this action');
    return;
  }
  return response.json();
}
```

---

## 17. Environment Variables

### Backend Services (.env)

```env
KEYCLOAK_ISSUER=http://localhost:8080/realms/cargoez
ADMIN_SERVICE_URL=http://localhost:3001
```

### Frontend Apps (.env)

```env
# SysAdmin Portal
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=cargoez
VITE_KEYCLOAK_CLIENT_ID=cargoez-admin
VITE_API_URL=http://localhost:3001

# Tenant Portal
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=cargoez
VITE_KEYCLOAK_CLIENT_ID=cargoez-web
VITE_API_URL=http://localhost:3002
```

### Production Checklist

| Setting | Development | Production |
|---------|-------------|------------|
| `KEYCLOAK_ISSUER` | `http://localhost:8080/realms/cargoez` | `https://auth.cargoez.com/realms/cargoez` |
| Redirect URIs | `http://localhost:*` | `https://admin.cargoez.com/*`, `https://app.cargoez.com/*` |
| Admin password | `admin` | Strong, unique password |
| HTTPS | Not required | **Required** |
| Token lifespan | 300s (5 min) | 300s or shorter |

---

## 18. Security Best Practices

### For Backend Developers

1. **Never store or log tokens** — they are sensitive credentials
2. **Always validate tokens server-side** — never trust the client
3. **Use `@RequirePermission()` on all write endpoints** — the ABAC database is the single source of truth
4. **Do not put tenant_uid in JWT** — always resolve via admin-service
5. **CORS is configured with explicit origin whitelist** — no wildcard `*`

### For Frontend Developers

1. **Always use PKCE** — never use Implicit flow (deprecated)
2. **Store tokens in memory only** — avoid localStorage for access tokens
3. **Use `sessionStorage` for OIDC state** — cleared when browser tab closes
4. **Handle 401 by re-authenticating** — tokens expire every 5 minutes
5. **Use the correct client ID** — `cargoez-admin` for SysAdmin, `cargoez-web` for Tenant portal

### For Mobile Developers

1. **Use system browser for login** — never embed a WebView for auth
2. **Store tokens in secure storage** — Keychain (iOS) / EncryptedSharedPreferences (Android)
3. **Always use PKCE** — mandatory for mobile apps

---

## 19. Troubleshooting

### "401 Unauthorized" on every request

1. **Check if Keycloak is running:** `curl http://localhost:8080/realms/cargoez`
2. **Check if KEYCLOAK_ISSUER is set** in service `.env` file
3. **Check if the token is expired** — tokens last only 5 minutes
4. **Check if admin-service is running** — required for resolve-context

### "403 Forbidden" when calling an endpoint

1. **Decode the JWT** at [jwt.io](https://jwt.io) and check `realm_access.roles`
2. **Verify the user has the required permission** in the tenant DB (role_permissions table)
3. **Check resolve-context** — call admin-service directly to see what permissions are returned
4. **Check cache** — permissions are cached 5 min; recent permission changes may not be reflected

### resolve-context returns empty permissions

1. **Check the user exists in admin_db** — the keycloak_sub must be mapped to a user record
2. **Check tenant assignment** — user must be linked to a tenant
3. **Check role_permissions in tenant DB** — the user's role must have permissions assigned

### CORS errors from frontend

1. **Check Keycloak web origins** — ensure your frontend URL is in `webOrigins`
2. **Check service CORS origin whitelist** — each service's `main.ts` has `app.enableCors({ origin: [...] })`

---

## 20. Glossary

| Term | Definition |
|------|------------|
| **OAuth 2.0** | Industry standard protocol for authorization |
| **OIDC (OpenID Connect)** | Identity layer on top of OAuth 2.0 |
| **Keycloak** | Open-source identity and access management server |
| **JWT (JSON Web Token)** | Compact token format for transmitting claims |
| **JWKS (JSON Web Key Set)** | Endpoint that publishes public keys for JWT verification |
| **PKCE** | OAuth 2.0 extension protecting Authorization Code flow from interception |
| **resolve-context** | admin-service internal endpoint combining user identity, DB config, and permissions |
| **keycloak_sub** | The `sub` claim in JWT — Keycloak's unique user ID |
| **tenant_uid** | CargoEz tenant identifier — resolved by admin-service, not stored in JWT |
| **RequestContext** | AsyncLocalStorage-based context populated by ContextInterceptor |
| **TenantConnectionManager** | Resolves the correct tenant DB connection at runtime |
| **ABAC** | Attribute-Based Access Control — permission conditions evaluated at runtime |
| **Realm Role** | Keycloak role defining user type (sys_admin, tenant_admin, etc.) |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    KEYCLOAK ENDPOINTS                             │
├─────────────────────────────────────────────────────────────────┤
│ Token URL:     POST http://localhost:8080/realms/cargoez/        │
│                protocol/openid-connect/token                     │
│ JWKS URL:      http://localhost:8080/realms/cargoez/              │
│                protocol/openid-connect/certs                     │
│ Discovery:     http://localhost:8080/realms/cargoez/              │
│                .well-known/openid-configuration                  │
│ Admin:         http://localhost:8080/admin (admin / admin)        │
├─────────────────────────────────────────────────────────────────┤
│                    CLIENTS                                       │
├─────────────────────────────────────────────────────────────────┤
│ SysAdmin:    cargoez-admin   (PKCE — admin.cargoez.com)          │
│ Tenant:      cargoez-web     (PKCE — app.cargoez.com)            │
├─────────────────────────────────────────────────────────────────┤
│                    REALM ROLES                                   │
├─────────────────────────────────────────────────────────────────┤
│ sys_admin       → Platform administrator                         │
│ tenant_admin    → Tenant administrator                           │
│ app_customer    → Standard user                                  │
│ branch_customer → Branch-level user                              │
├─────────────────────────────────────────────────────────────────┤
│                    INTERNAL                                      │
├─────────────────────────────────────────────────────────────────┤
│ resolve-context: GET admin-service/internal/resolve-context      │
│ Cache TTL:       5 minutes per keycloak_sub                      │
└─────────────────────────────────────────────────────────────────┘
```
