# CargoEz — Authentication & Authorization Guide

> Complete reference for API authentication using Keycloak (OAuth 2.0 / OIDC). Covers backend developers, frontend developers, mobile developers, and API testers.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [How It Works](#2-how-it-works)
3. [Keycloak Setup](#3-keycloak-setup)
4. [Keycloak Clients](#4-keycloak-clients)
5. [Users, Roles & Permissions](#5-users-roles--permissions)
6. [Getting Tokens from Postman (API Testing)](#6-getting-tokens-from-postman-api-testing)
7. [Getting Tokens from curl / PowerShell](#7-getting-tokens-from-curl--powershell)
8. [Using Tokens in Swagger UI](#8-using-tokens-in-swagger-ui)
9. [Frontend Web Integration (PKCE)](#9-frontend-web-integration-pkce)
10. [Mobile App Integration (PKCE)](#10-mobile-app-integration-pkce)
11. [Service-to-Service Authentication](#11-service-to-service-authentication)
12. [Token Anatomy](#12-token-anatomy)
13. [Token Refresh](#13-token-refresh)
14. [Backend Middleware Reference](#14-backend-middleware-reference)
15. [Route Protection Reference](#15-route-protection-reference)
16. [Error Responses](#16-error-responses)
17. [Environment Variables](#17-environment-variables)
18. [Security Best Practices](#18-security-best-practices)
19. [Troubleshooting](#19-troubleshooting)
20. [Glossary](#20-glossary)

---

## 1. Architecture Overview

```
                                ┌─────────────────────────┐
                                │       Keycloak           │
                                │   (Authorization Server) │
                                │   http://localhost:8080   │
                                │                           │
                                │  ┌─────────────────────┐ │
                                │  │   cargoez realm      │ │
                                │  │   ├── cargoez-api    │ │  ← Postman / API testing (ROPC)
                                │  │   ├── cargoez-web    │ │  ← Frontend web apps (PKCE)
                                │  │   ├── cargoez-mobile │ │  ← Mobile apps (PKCE)
                                │  │   └── cargoez-service│ │  ← Service-to-service (Client Credentials)
                                │  └─────────────────────┘ │
                                └────────────┬────────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │ JWT (access_token)│                  │
                          ▼                  ▼                  ▼
                  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                  │ user-service │  │ shared-db-   │  │   future     │
                  │  :3001       │  │ example :3005│  │  services    │
                  │              │  │              │  │              │
                  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │
                  │ │JWKS      │ │  │ │JWKS      │ │  │ │JWKS      │ │
                  │ │verify    │ │  │ │verify    │ │  │ │verify    │ │
                  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │
                  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │
                  │ │Role      │ │  │ │Role      │ │  │ │Role      │ │
                  │ │check     │ │  │ │check     │ │  │ │check     │ │
                  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │
                  └──────────────┘  └──────────────┘  └──────────────┘
```

**Key Concepts:**

- **Keycloak** is the single source of truth for user identities, passwords, and roles
- **Clients** represent different applications that need tokens (web, mobile, API tools, services)
- **JWT access tokens** are issued by Keycloak and verified by each microservice independently
- **JWKS** (JSON Web Key Set) is how microservices verify token signatures without sharing secrets
- The backend **never sees passwords** — only validated JWT tokens

---

## 2. How It Works

### OAuth 2.0 Flows Used

| Flow | Client | Use Case | Security Level |
|------|--------|----------|---------------|
| **Authorization Code + PKCE** | `cargoez-web` | Frontend web apps (React, Angular, Vue) | Highest — passwords never leave Keycloak |
| **Authorization Code + PKCE** | `cargoez-mobile` | Mobile apps (React Native, Flutter) | Highest — passwords never leave Keycloak |
| **Resource Owner Password (ROPC)** | `cargoez-api` | Postman, curl, CLI tools, dev testing | Medium — client sends username/password directly |
| **Client Credentials** | `cargoez-service` | Service-to-service (no user context) | High — uses client_id + client_secret |

### Token Verification Flow (All Flows)

Regardless of how the token was obtained, every microservice verifies it the same way:

```
1. Client sends:  Authorization: Bearer <JWT>
2. Middleware extracts the JWT
3. Middleware fetches Keycloak's public key via JWKS endpoint (cached 10 min)
4. Middleware verifies: signature (RS256), issuer, audience, expiry
5. On success: req.user = { sub, email, roles, ... }
6. On failure: 401 Unauthorized
```

---

## 3. Keycloak Setup

### Option A: Standalone (Java 17+)

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

### Option B: Docker Compose

```bash
docker-compose up -d keycloak
```

### Keycloak Admin Console

| URL | Credentials | Purpose |
|-----|-------------|---------|
| http://localhost:8080/admin | `admin` / `admin` | Manage realm, users, roles, clients |

> **Important:** The admin console credentials (`admin`/`admin`) are different from the API test user credentials (`admin`/`admin123`).

---

## 4. Keycloak Clients

The `cargoez` realm has 4 pre-configured clients, each for a specific use case:

### cargoez-api (Postman / API Testing)

| Setting | Value |
|---------|-------|
| Client ID | `cargoez-api` |
| Type | Public (no secret) |
| Grant Type | Resource Owner Password Credentials (ROPC) |
| PKCE | Not applicable (direct grant) |
| Use For | Postman, curl, CLI tools, Swagger "Try it out" |

### cargoez-web (Frontend Web Apps)

| Setting | Value |
|---------|-------|
| Client ID | `cargoez-web` |
| Type | Public (no secret) |
| Grant Type | Authorization Code + PKCE (S256) |
| PKCE Enforcement | Required (S256 only) |
| Redirect URIs | `http://localhost:3000/*` (React/Next.js), `http://localhost:5173/*` (Vite), `http://localhost:4200/*` (Angular), `http://localhost:8100/*` (Ionic) |
| Use For | React, Angular, Vue, Next.js, or any browser-based SPA |

### cargoez-mobile (Mobile Apps)

| Setting | Value |
|---------|-------|
| Client ID | `cargoez-mobile` |
| Type | Public (no secret) |
| Grant Type | Authorization Code + PKCE (S256) |
| PKCE Enforcement | Required (S256 only) |
| Redirect URIs | `cargoez://callback`, `cargoez://oauth/callback`, `exp://127.0.0.1:8081/--/auth/callback` |
| Use For | React Native, Flutter, Expo, or any native mobile app |

### cargoez-service (Service-to-Service)

| Setting | Value |
|---------|-------|
| Client ID | `cargoez-service` |
| Type | Confidential (has secret) |
| Client Secret | `cargoez-service-secret` |
| Grant Type | Client Credentials |
| Use For | Backend microservice-to-microservice calls (no user context) |

---

## 5. Users, Roles & Permissions

### Realm Roles

| Role | Description |
|------|-------------|
| `admin` | Full CRUD access — can create, read, update, and delete all resources |
| `manager` | Manager access — can read and update (no create or delete) |
| `user` | Standard access — read-only operations |

### Pre-configured Test Users

| Username | Password | Roles | API Permissions |
|----------|----------|-------|-----------------|
| `admin` | `admin123` | `admin`, `user` | GET, POST, PUT, DELETE on all endpoints |
| `manager` | `manager123` | `manager`, `user` | GET, PUT only |
| `testuser` | `test123` | `user` | GET only (read-only) |

### Route Protection Matrix (user-service example)

| Endpoint | Method | Required Role | admin | manager | testuser |
|----------|--------|--------------|-------|---------|----------|
| `/health` | GET | None (public) | Yes | Yes | Yes |
| `/users` | GET | Any authenticated | Yes | Yes | Yes |
| `/users/:id` | GET | Any authenticated | Yes | Yes | Yes |
| `/users` | POST | `admin` | Yes | **403** | **403** |
| `/users/:id` | PUT | `admin` or `manager` | Yes | Yes | **403** |
| `/users/:id` | DELETE | `admin` | Yes | **403** | **403** |

---

## 6. Getting Tokens from Postman (API Testing)

This section is for backend developers and API testers who need to quickly get tokens for testing.

### Step-by-Step

**1. Create a new POST request**

- Method: `POST`
- URL: `http://localhost:8080/realms/cargoez/protocol/openid-connect/token`

**2. Configure the Body**

- Go to the **Body** tab
- Select **x-www-form-urlencoded**
- Add these key-value pairs:

| Key | Value |
|-----|-------|
| `grant_type` | `password` |
| `client_id` | `cargoez-api` |
| `username` | `admin` |
| `password` | `admin123` |

**3. Click Send**

Response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIs...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzUxMiIs...",
  "token_type": "Bearer",
  "scope": "profile email"
}
```

**4. Use the token**

- Copy the `access_token` value
- In your API request, go to the **Authorization** tab
- Select **Bearer Token**
- Paste the token

### Auto-Token with Pre-request Script

To avoid manually copying tokens, add this **Pre-request Script** to your Postman collection:

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
      { key: 'client_id', value: 'cargoez-api' },
      { key: 'username', value: 'admin' },
      { key: 'password', value: 'admin123' },
    ]
  }
}, (err, res) => {
  if (err) {
    console.error('Token request failed:', err);
  } else {
    const token = res.json().access_token;
    pm.collectionVariables.set('access_token', token);
    console.log('Token refreshed successfully');
  }
});
```

Then set your collection's Authorization to: **Bearer Token** → `{{access_token}}`

Every request will auto-fetch a fresh token before executing.

### Switching Users in Postman

Change the `username` and `password` in the token request body:

| To test as... | username | password |
|---------------|----------|----------|
| Admin (full access) | `admin` | `admin123` |
| Manager (read + update) | `manager` | `manager123` |
| Regular user (read-only) | `testuser` | `test123` |

---

## 7. Getting Tokens from curl / PowerShell

### curl (Linux / macOS / Git Bash)

```bash
# Get token
TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/cargoez/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=cargoez-api&username=admin&password=admin123" \
  | jq -r '.access_token')

# Use token
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/users
```

### PowerShell (Windows)

```powershell
# Get token
$body = @{
  grant_type = "password"
  client_id  = "cargoez-api"
  username   = "admin"
  password   = "admin123"
}
$token = (Invoke-RestMethod `
  -Uri "http://localhost:8080/realms/cargoez/protocol/openid-connect/token" `
  -Method POST -Body $body `
  -ContentType "application/x-www-form-urlencoded").access_token

# Use token
Invoke-RestMethod -Uri "http://localhost:3001/users" `
  -Headers @{ Authorization = "Bearer $token" }
```

---

## 8. Using Tokens in Swagger UI

Works in both individual service Swagger (`http://localhost:3001/api-docs`) and the global API Portal (`http://localhost:4000`).

1. Get a token using Postman, curl, or PowerShell (see sections above)
2. Open Swagger UI
3. Click the **"Authorize"** button (lock icon at the top-right)
4. Paste the `access_token` value (without the `Bearer ` prefix)
5. Click **"Authorize"**, then **"Close"**
6. All "Try it out" calls now include the token automatically
7. Lock icons next to endpoints turn **locked** when authorized

> **Note:** In the API Portal, you need to authorize separately for each service selected in the dropdown.

---

## 9. Frontend Web Integration (PKCE)

This section is for frontend developers building React, Angular, Vue, or Next.js applications.

### What is PKCE?

**PKCE (Proof Key for Code Exchange)** is the recommended OAuth 2.0 flow for browser-based apps. The user is redirected to Keycloak's login page, enters credentials there (your app never sees the password), and Keycloak redirects back with a secure authorization code.

```
┌──────────────┐                          ┌───────────────┐
│  Your React   │  1. User clicks "Login"  │   Keycloak    │
│  App          │─────────────────────────>│               │
│  :3000        │  redirect to /auth       │   :8080       │
│               │  + code_challenge (S256) │               │
│               │                          │  Login Page   │
│               │  2. User enters password │               │
│               │                          │               │
│               │  3. Redirect back        │               │
│               │<─────────────────────────│               │
│               │  ?code=abc123            │               │
│               │                          │               │
│               │  4. Exchange code        │               │
│               │─────────────────────────>│  Verify       │
│               │  code + code_verifier    │  code_verifier│
│               │<─────────────────────────│  matches      │
│               │  access_token + refresh  │  challenge    │
│               │                          │               │
│               │  5. Call API             │               │
│               │  Authorization: Bearer   │               │
│               │  <token>                 │               │
└──────────────┘                          └───────────────┘
         │
         │  6. API call with Bearer token
         ▼
  ┌──────────────┐
  │ user-service │
  │  :3001       │
  │  JWKS verify │
  └──────────────┘
```

### Keycloak Configuration

| Setting | Value |
|---------|-------|
| Client ID | `cargoez-web` |
| PKCE Method | S256 (enforced) |
| Redirect URIs | Pre-configured for common dev ports |

### React Example (using `oidc-client-ts` or `react-oidc-context`)

**Install:**

```bash
npm install oidc-client-ts react-oidc-context
```

**Configure:**

```typescript
// src/auth/config.ts
import { WebStorageStateStore } from 'oidc-client-ts';

export const oidcConfig = {
  authority: 'http://localhost:8080/realms/cargoez',
  client_id: 'cargoez-web',
  redirect_uri: 'http://localhost:3000/auth/callback',
  post_logout_redirect_uri: 'http://localhost:3000',
  response_type: 'code',
  scope: 'openid profile email',
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // PKCE is enabled by default in oidc-client-ts
};
```

**Wrap your app:**

```tsx
// src/main.tsx
import { AuthProvider } from 'react-oidc-context';
import { oidcConfig } from './auth/config';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider {...oidcConfig}>
    <App />
  </AuthProvider>
);
```

**Use in components:**

```tsx
// src/App.tsx
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

**Make API calls with the token:**

```typescript
// src/api/client.ts
import { useAuth } from 'react-oidc-context';

export function useApiClient() {
  const auth = useAuth();

  return {
    async get(url: string) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${auth.user?.access_token}`,
        },
      });
      return response.json();
    },

    async post(url: string, body: unknown) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.user?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return response.json();
    },
  };
}
```

### Angular Example (using `angular-auth-oidc-client`)

**Install:**

```bash
ng add angular-auth-oidc-client
```

**Configure:**

```typescript
// src/app/app.config.ts
import { provideAuth } from 'angular-auth-oidc-client';

export const appConfig = {
  providers: [
    provideAuth({
      config: {
        authority: 'http://localhost:8080/realms/cargoez',
        redirectUrl: 'http://localhost:4200/auth/callback',
        postLogoutRedirectUri: 'http://localhost:4200',
        clientId: 'cargoez-web',
        scope: 'openid profile email',
        responseType: 'code',
        // PKCE is enabled by default
      },
    }),
  ],
};
```

**Use in components:**

```typescript
import { OidcSecurityService } from 'angular-auth-oidc-client';

export class AppComponent {
  constructor(private oidcService: OidcSecurityService) {}

  login() { this.oidcService.authorize(); }
  logout() { this.oidcService.logoff(); }

  callApi() {
    this.oidcService.getAccessToken().subscribe(token => {
      fetch('http://localhost:3001/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
    });
  }
}
```

### Adding Your Frontend URL to Keycloak

If your frontend runs on a different port, update `keycloak/cargoez-realm.json`:

```json
{
  "clientId": "cargoez-web",
  "redirectUris": [
    "http://localhost:3000/*",
    "http://localhost:5173/*",
    "http://localhost:4200/*",
    "http://your-custom-port/*"
  ],
  "webOrigins": [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4200",
    "http://your-custom-port"
  ]
}
```

Or add it via the Keycloak Admin Console: **Realm Settings → Clients → cargoez-web → Valid Redirect URIs**.

---

## 10. Mobile App Integration (PKCE)

This section is for mobile developers building React Native, Flutter, or Expo apps.

### How It Works

Mobile apps use the same Authorization Code + PKCE flow, but instead of browser redirects, they use deep links (custom URL schemes) to receive the authorization code back from Keycloak.

```
1. App opens Keycloak login in system browser / in-app browser
2. User enters credentials on Keycloak's page
3. Keycloak redirects to cargoez://callback?code=abc123
4. App intercepts the deep link, exchanges code + verifier for tokens
5. App stores tokens securely and uses them for API calls
```

### Keycloak Configuration

| Setting | Value |
|---------|-------|
| Client ID | `cargoez-mobile` |
| PKCE Method | S256 (enforced) |
| Redirect URIs | `cargoez://callback`, `cargoez://oauth/callback`, `exp://127.0.0.1:8081/--/auth/callback` |

### React Native Example (using `react-native-app-auth`)

**Install:**

```bash
npm install react-native-app-auth
```

**Configure:**

```typescript
// src/auth/config.ts
import { authorize, refresh, revoke } from 'react-native-app-auth';

const config = {
  issuer: 'http://localhost:8080/realms/cargoez',
  clientId: 'cargoez-mobile',
  redirectUrl: 'cargoez://callback',
  scopes: ['openid', 'profile', 'email'],
  usePKCE: true,
};

export async function login() {
  const result = await authorize(config);
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.accessTokenExpirationDate,
  };
}

export async function refreshTokens(refreshToken: string) {
  const result = await refresh(config, { refreshToken });
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.accessTokenExpirationDate,
  };
}
```

**Use the token:**

```typescript
const { accessToken } = await login();

const response = await fetch('http://your-api-host:3001/users', {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const data = await response.json();
```

### Flutter Example (using `flutter_appauth`)

```yaml
# pubspec.yaml
dependencies:
  flutter_appauth: ^7.0.0
  flutter_secure_storage: ^9.0.0
```

```dart
import 'package:flutter_appauth/flutter_appauth.dart';

final appAuth = FlutterAppAuth();

Future<String?> login() async {
  final result = await appAuth.authorizeAndExchangeCode(
    AuthorizationTokenRequest(
      'cargoez-mobile',
      'cargoez://callback',
      issuer: 'http://localhost:8080/realms/cargoez',
      scopes: ['openid', 'profile', 'email'],
    ),
  );
  return result?.accessToken;
}
```

### Deep Link Setup

For mobile apps, you need to configure deep link handling:

**React Native (iOS):** Add to `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>cargoez</string>
    </array>
  </dict>
</array>
```

**React Native (Android):** Add to `AndroidManifest.xml`:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="cargoez" android:host="callback" />
</intent-filter>
```

---

## 11. Service-to-Service Authentication

For backend microservices calling other microservices without a user context (e.g., cron jobs, background tasks).

### Client Credentials Flow

```bash
curl -s -X POST \
  http://localhost:8080/realms/cargoez/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=cargoez-service" \
  -d "client_secret=cargoez-service-secret"
```

The returned token has no user context (`sub` is the service account ID). Use it to call other services:

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/users
```

> **Note:** In production, rotate `cargoez-service-secret` regularly and never commit it to source control.

---

## 12. Token Anatomy

A decoded JWT access token from Keycloak contains:

```json
{
  "exp": 1740553200,
  "iat": 1740552900,
  "iss": "http://localhost:8080/realms/cargoez",
  "aud": "cargoez-api",
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "typ": "Bearer",
  "azp": "cargoez-web",
  "preferred_username": "admin",
  "email": "admin@cargoez.com",
  "name": "Admin User",
  "realm_access": {
    "roles": ["admin", "user"]
  },
  "resource_access": {
    "cargoez-api": {
      "roles": ["manage-users"]
    }
  },
  "scope": "openid profile email"
}
```

| Field | Description |
|-------|-------------|
| `exp` | Token expiry (Unix timestamp) — 300 seconds (5 min) from issue |
| `iss` | Issuer — must match `KEYCLOAK_ISSUER` env var |
| `aud` | Audience — must match `KEYCLOAK_AUDIENCE` env var |
| `sub` | Subject — unique Keycloak user ID (UUID) |
| `azp` | Authorized Party — the client that requested the token |
| `realm_access.roles` | Realm-level roles assigned to the user |
| `resource_access` | Client-level roles (if configured) |
| `preferred_username` | User's username |
| `email` | User's email |

### What the Backend Checks

Our `createAuthMiddleware` verifies:

1. **Signature** — using Keycloak's RSA public key (fetched via JWKS, cached 10 min)
2. **Algorithm** — must be RS256
3. **Issuer** — must match `KEYCLOAK_ISSUER`
4. **Audience** — must match `KEYCLOAK_AUDIENCE` (if configured)
5. **Expiry** — token must not be expired

---

## 13. Token Refresh

Access tokens expire after **5 minutes** (300 seconds). Use the refresh token to get a new access token without re-entering credentials.

### From Postman / curl

```bash
curl -s -X POST \
  http://localhost:8080/realms/cargoez/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "client_id=cargoez-api" \
  -d "refresh_token=<YOUR_REFRESH_TOKEN>"
```

### From Frontend (Automatic)

Libraries like `oidc-client-ts` and `react-native-app-auth` handle token refresh automatically. They detect when the access token is about to expire and silently request a new one using the refresh token.

### Refresh Token Lifespan

| Token | Lifespan |
|-------|----------|
| Access Token | 5 minutes (300 seconds) |
| Refresh Token | 30 minutes (1800 seconds) |
| SSO Session | 10 hours (36000 seconds) |

---

## 14. Backend Middleware Reference

The authentication middleware is in `@rajkumarganesan93/infrastructure`. No backend code changes are needed to support PKCE — the middleware verifies JWTs regardless of how they were obtained.

### createAuthMiddleware

Automatically mounted by `createServiceApp` when `KEYCLOAK_ISSUER` is set in `.env`.

```typescript
import { createAuthMiddleware } from '@rajkumarganesan93/infrastructure';
import type { AuthConfig } from '@rajkumarganesan93/infrastructure';

// Automatically applied by createServiceApp. Manual usage:
app.use(createAuthMiddleware({
  issuer: 'http://localhost:8080/realms/cargoez',
  audience: 'cargoez-api',
  publicPaths: ['/health', '/api-docs'],  // defaults
}));
```

**Public paths** (skip authentication): `/health`, `/api-docs`, `/api-docs/*`

### authorize

Per-route role enforcement. Must be placed after authentication middleware.

```typescript
import { authorize } from '@rajkumarganesan93/infrastructure';

router.post('/users', authorize('admin'), handler);
router.put('/users/:id', authorize('admin', 'manager'), handler);
router.get('/users', handler);  // any authenticated user
```

### AuthUser (attached to req.user)

```typescript
interface AuthUser {
  sub: string;              // Keycloak user ID (UUID)
  email?: string;           // User email
  preferredUsername?: string; // Username
  name?: string;            // Full name
  realmRoles: string[];     // e.g., ['admin', 'user']
  resourceRoles: string[];  // Client-specific roles
  tokenPayload: Record<string, unknown>; // Full decoded JWT
}
```

Access in controllers:

```typescript
import type { AuthenticatedRequest } from '@rajkumarganesan93/infrastructure';

const user = (req as AuthenticatedRequest).user;
console.log(user.sub, user.email, user.realmRoles);
```

---

## 15. Route Protection Reference

### Pattern

```typescript
// routes.ts
import { authorize } from '@rajkumarganesan93/infrastructure';

// Public (no auth needed — handled by publicPaths in middleware)
// /health, /api-docs — configured in createAuthMiddleware

// Authenticated (any valid token, any role)
router.get('/users', asyncHandler(controller.getAll));

// Role-restricted (must have at least one of the listed roles)
router.post('/users', authorize('admin'), handler);
router.put('/users/:id', authorize('admin', 'manager'), handler);
router.delete('/users/:id', authorize('admin'), handler);
```

### How Role Checking Works

`authorize('admin', 'manager')` means the user must have **at least one** of those roles (OR logic, not AND). Roles are checked from both `realm_access.roles` and `resource_access.<client>.roles`.

---

## 16. Error Responses

### Authentication Errors (401)

**No token provided:**

```json
{
  "success": false,
  "messageCode": "UNAUTHORIZED",
  "error": "Authentication required",
  "statusCode": 401,
  "timestamp": "2026-02-26T06:00:00.000Z"
}
```

**Invalid or malformed token:**

```json
{
  "success": false,
  "messageCode": "UNAUTHORIZED",
  "error": "Authentication required",
  "statusCode": 401,
  "timestamp": "2026-02-26T06:00:00.000Z"
}
```

**Expired token:**

```json
{
  "success": false,
  "messageCode": "TOKEN_EXPIRED",
  "error": "Token has expired",
  "statusCode": 401,
  "timestamp": "2026-02-26T06:00:00.000Z"
}
```

### Authorization Errors (403)

**Valid token but insufficient role:**

```json
{
  "success": false,
  "messageCode": "FORBIDDEN",
  "error": "You do not have permission to perform this action",
  "statusCode": 403,
  "timestamp": "2026-02-26T06:00:00.000Z"
}
```

### Handling in Frontend

```typescript
// Centralized error handler
async function apiCall(url: string, options: RequestInit) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    // Token expired or invalid — trigger re-login
    auth.signinRedirect();
    return;
  }

  if (response.status === 403) {
    // User doesn't have permission — show message
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
# Required for authentication
KEYCLOAK_ISSUER=http://localhost:8080/realms/cargoez
KEYCLOAK_AUDIENCE=cargoez-api

# Remove or comment to disable auth entirely
# KEYCLOAK_ISSUER=http://localhost:8080/realms/cargoez
```

### Frontend Apps (.env)

```env
# React / Vite
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=cargoez
VITE_KEYCLOAK_CLIENT_ID=cargoez-web
VITE_API_URL=http://localhost:3001

# Angular
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=cargoez
KEYCLOAK_CLIENT_ID=cargoez-web
API_URL=http://localhost:3001
```

### Production Checklist

| Setting | Development | Production |
|---------|-------------|------------|
| `KEYCLOAK_ISSUER` | `http://localhost:8080/realms/cargoez` | `https://auth.cargoez.com/realms/cargoez` |
| `sslRequired` (Keycloak) | `none` | `external` or `all` |
| Redirect URIs | `http://localhost:*` | `https://app.cargoez.com/*` |
| Admin password | `admin` | Strong, unique password |
| User passwords | Simple test passwords | Enforced password policy |
| Token lifespan | 300s (5 min) | 300s or shorter |
| HTTPS | Not required | **Required** |

---

## 18. Security Best Practices

### For Backend Developers

1. **Never store or log tokens** — they are sensitive credentials
2. **Always validate tokens server-side** — never trust the client
3. **Use `authorize()` on write endpoints** — even if the frontend hides buttons
4. **Keep `KEYCLOAK_AUDIENCE` set** — prevents tokens from other clients being used
5. **CORS is configured** — only allowed origins can make API calls

### For Frontend Developers

1. **Always use PKCE** — never use Implicit flow (deprecated)
2. **Store tokens in memory only** — avoid localStorage for access tokens
3. **Use `sessionStorage` for OIDC state** — cleared when browser tab closes
4. **Handle 401 by re-authenticating** — tokens expire every 5 minutes
5. **Never expose tokens in URLs** — use Authorization header only
6. **Use a library** — don't implement OAuth flows manually

### For Mobile Developers

1. **Use system browser for login** — never embed a WebView for auth
2. **Store tokens in secure storage** — Keychain (iOS) / EncryptedSharedPreferences (Android)
3. **Always use PKCE** — mandatory for mobile apps
4. **Handle deep links securely** — validate the callback URL scheme

---

## 19. Troubleshooting

### "401 Unauthorized" on every request

1. **Check if Keycloak is running:** `curl http://localhost:8080/realms/cargoez`
2. **Check if KEYCLOAK_ISSUER is set:** look in service `.env` file
3. **Check if the token is expired:** tokens last only 5 minutes
4. **Check if the audience matches:** token `aud` must match `KEYCLOAK_AUDIENCE`

### "403 Forbidden" when calling an endpoint

1. **Check user roles:** decode the JWT at [jwt.io](https://jwt.io) and look at `realm_access.roles`
2. **Check route requirements:** look at `authorize('admin')` in `routes.ts`
3. **Try with admin user:** get a token with `username=admin&password=admin123`

### Token request returns error

| Error | Cause | Fix |
|-------|-------|-----|
| `invalid_client` | Wrong `client_id` | Use `cargoez-api` for Postman, `cargoez-web` for frontend |
| `invalid_grant` | Wrong username/password | Check credentials in test users table |
| `unauthorized_client` | Client doesn't support the grant type | `cargoez-web` uses PKCE (not password grant) — use `cargoez-api` for Postman |

### CORS errors from frontend

1. **Check Keycloak web origins:** in `cargoez-realm.json`, ensure your frontend URL is in `webOrigins`
2. **Check service CORS:** `createServiceApp` includes `cors()` middleware automatically
3. **Check redirect URI:** your callback URL must be in `redirectUris`

### "PKCE code_challenge required" error

The `cargoez-web` and `cargoez-mobile` clients enforce PKCE. If you get this error:
- Your OIDC library is not sending `code_challenge` — enable PKCE in its config
- You're using the wrong client — use `cargoez-api` for direct password grants

---

## 20. Glossary

| Term | Definition |
|------|------------|
| **OAuth 2.0** | Industry standard protocol for authorization |
| **OIDC (OpenID Connect)** | Identity layer on top of OAuth 2.0 — adds user profile info |
| **Keycloak** | Open-source identity and access management server |
| **JWT (JSON Web Token)** | Compact, URL-safe token format for securely transmitting claims |
| **JWKS (JSON Web Key Set)** | Endpoint that publishes public keys for JWT signature verification |
| **PKCE (Proof Key for Code Exchange)** | OAuth 2.0 extension that protects the Authorization Code flow from interception attacks |
| **ROPC (Resource Owner Password Credentials)** | OAuth 2.0 flow where the client sends username/password directly (for testing only) |
| **Client Credentials** | OAuth 2.0 flow for service-to-service auth (no user involved) |
| **Access Token** | Short-lived JWT (5 min) sent with every API request |
| **Refresh Token** | Longer-lived token (30 min) used to get new access tokens without re-login |
| **Realm** | A Keycloak namespace containing users, roles, and clients |
| **Client** | An application registered in Keycloak (web app, mobile app, service) |
| **Public Client** | A client that cannot keep a secret (browser, mobile) — uses PKCE |
| **Confidential Client** | A client that can keep a secret (backend service) — uses client_secret |
| **Issuer** | The Keycloak URL that issued the token (verified by backend) |
| **Audience** | The intended recipient of the token (verified by backend) |
| **RS256** | RSA Signature with SHA-256 — the algorithm used to sign JWTs |
| **S256** | SHA-256 — the hash method used for PKCE code challenges |
| **Bearer Token** | An access token sent in the `Authorization: Bearer <token>` header |
| **Deep Link** | A URL scheme (e.g., `cargoez://callback`) that opens a mobile app |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN ENDPOINTS                               │
├─────────────────────────────────────────────────────────────────┤
│ Token URL:     POST http://localhost:8080/realms/cargoez/        │
│                protocol/openid-connect/token                     │
│ Auth URL:      http://localhost:8080/realms/cargoez/              │
│                protocol/openid-connect/auth                      │
│ JWKS URL:      http://localhost:8080/realms/cargoez/              │
│                protocol/openid-connect/certs                     │
│ Discovery:     http://localhost:8080/realms/cargoez/              │
│                .well-known/openid-configuration                  │
│ Admin:         http://localhost:8080/admin (admin / admin)        │
├─────────────────────────────────────────────────────────────────┤
│                    CLIENT IDS                                    │
├─────────────────────────────────────────────────────────────────┤
│ Postman/curl:  cargoez-api     (ROPC, direct password grant)     │
│ Web frontend:  cargoez-web     (Authorization Code + PKCE)       │
│ Mobile app:    cargoez-mobile  (Authorization Code + PKCE)       │
│ Service-to-svc: cargoez-service (Client Credentials)             │
├─────────────────────────────────────────────────────────────────┤
│                    TEST USERS                                    │
├─────────────────────────────────────────────────────────────────┤
│ admin / admin123     → roles: admin, user                        │
│ manager / manager123 → roles: manager, user                      │
│ testuser / test123   → roles: user                               │
└─────────────────────────────────────────────────────────────────┘
```
