# Architecture Decision Record: Express → Nx + NestJS + pnpm Migration

> This document records the architectural decision to migrate the CargoEz backend from a pure Express + npm workspaces architecture to Nx + NestJS + pnpm. The migration has been **completed** and is the current production architecture.

---

## 1. Decision

**Adopted:** Full migration to Nx + NestJS + pnpm (Option C from the original comparison).

**Date:** February 2026

**Status:** Completed

---

## 2. Context

The original backend was built with Express.js, npm workspaces, and 6 publishable packages under the `@rajkumarganesan93` scope. It implemented Clean Architecture, Keycloak authentication, real-time data sync, and a comprehensive shared package ecosystem.

The team evaluated three options:
- **Option A:** Keep Express stack (no changes)
- **Option B:** Add Nx to existing Express stack (hybrid)
- **Option C:** Full rewrite to Nx + NestJS + pnpm

Option C was chosen to leverage NestJS's built-in dependency injection, decorator-based patterns, and the ecosystem advantages of a well-structured framework.

---

## 3. What Changed

### Before (Express + npm workspaces)

| Component | Approach |
|---|---|
| Framework | Express (minimal, functional) |
| Monorepo | npm workspaces |
| Package Manager | npm |
| Packages | 6 publishable packages (`@rajkumarganesan93/*`) |
| Validation | Zod schemas + `validateBody()` middleware |
| Auth | Custom `createAuthMiddleware()` |
| DI | Manual wiring in `index.ts` |
| Swagger | Hand-written specs with helper utilities |
| App Bootstrap | `createServiceApp()` factory |
| WebSockets | Manual Socket.IO integration |

### After (Nx + NestJS + pnpm) — Current Architecture

| Component | Approach |
|---|---|
| Framework | NestJS 11 (decorator-based, built-in DI) |
| Monorepo | Nx 22 (smart caching, affected commands, dependency graph) |
| Package Manager | pnpm 10 (fast, strict, disk-efficient) |
| Libraries | 4 workspace libs (`@cargoez/*`) |
| Validation | class-validator + class-transformer (DTO decorators) |
| Auth | `AuthModule` with global `JwtAuthGuard` + `RolesGuard` + `PermissionsGuard` (ABAC) |
| DI | NestJS IoC container with DI tokens |
| Swagger | Auto-generated from `@ApiProperty`, `@ApiResponse` decorators |
| App Bootstrap | NestJS `NestFactory.create()` + global pipes/filters/interceptors |
| WebSockets | NestJS `@WebSocketGateway()` via `RealtimeModule` |

---

## 4. What Was Preserved

All features from the original architecture were re-implemented in NestJS:

| Feature | Original Implementation | NestJS Implementation |
|---|---|---|
| Clean Architecture | `domain/ → application/ → infrastructure/ → presentation/` | Same 4-layer structure, identical directory layout |
| BaseEntity | `@rajkumarganesan93/domain` `BaseEntity` type | `@cargoez/domain` `BaseEntity` interface |
| Repository Pattern | `IRepository<T>` interface + `BaseRepository` class | `IBaseRepository<T>` interface + `BaseRepository<T>` class |
| Message Catalog | `MessageCode` enum + `MessageCatalog` map | Same pattern, now in `@cargoez/api` |
| Unified Response | `{ success, messageCode, message, data, timestamp }` | `ApiResponse<T>` — same envelope shape |
| Request Context | AsyncLocalStorage via `requestContextMiddleware` | AsyncLocalStorage via `ContextInterceptor` |
| Auto Audit Fields | BaseRepository auto-populates `createdBy`, `modifiedBy` | Same behavior, reads from `RequestContext` |
| Real-Time Sync | Socket.IO + DomainEventBus, auto-emit on mutations | `RealtimeGateway` + `domainEventBus`, same auto-emit |
| JWT Auth (Keycloak) | JWKS verification middleware | `JwtAuthGuard` with JWKS verification |
| Authorization | `authorize('admin')` middleware | `@RequirePermission()` (pure ABAC) + `@Roles()` (area-level only) |
| Pagination | `parsePaginationFromQuery()` → `PaginatedResult<T>` | Query params → `PaginationOptions` → `PaginatedResult<T>` |
| API Portal | Express app fetching/merging Swagger specs | Express app with service dropdown + reverse proxy |
| Database Migrations | Knex.js migrations per service | Same — Knex.js migrations per service |

---

## 5. Library Mapping

| Old Package (`@rajkumarganesan93/*`) | New Library (`@cargoez/*`) | Notes |
|---|---|---|
| `domain` | `domain` | Same purpose, simplified (BaseEntity is now an interface) |
| `application` | _(removed)_ | Logger moved to `infrastructure`, mapper logic handled by Knex column aliases |
| `api` | `api` | Same — MessageCode, MessageCatalog, ApiResponse, exceptions |
| `shared` | `shared` | Simplified — now just `DatabaseModule` + `@InjectKnex()` |
| `infrastructure` | `infrastructure` | Reimplemented with NestJS guards, interceptors, modules |
| `integrations` | _(removed)_ | Can be re-added when email/notification providers are needed |

---

## 6. Migration Outcomes

### Benefits Realized

| Benefit | Impact |
|---|---|
| **Nx caching** | Instant rebuilds when source hasn't changed |
| **Nx affected** | Only build/test what changed in a PR |
| **Nx dependency graph** | Visual understanding of project dependencies (`pnpm graph`) |
| **NestJS DI** | No more manual wiring — providers registered in modules |
| **Auto Swagger** | DTOs automatically generate OpenAPI specs via decorators |
| **Global guards** | Auth applied globally, `@Public()` for exceptions |
| **Structured modules** | Each feature is a self-contained NestJS module |
| **pnpm strictness** | No phantom dependency issues |

### Trade-offs Accepted

| Trade-off | Assessment |
|---|---|
| Larger bundle size (~30MB vs ~2MB) | Acceptable for backend services |
| Slightly slower cold startup (~500ms vs ~200ms) | Negligible in production (services are long-running) |
| NestJS learning curve | Mitigated by consistent patterns and documentation |
| Lost 6 publishable packages | Replaced by workspace-only libs (simpler, no publishing overhead) |

---

## 7. Lessons Learned

1. **Clean Architecture translates well** — the 4-layer structure works identically in both Express and NestJS
2. **DI tokens bridge the gap** — NestJS's `@Inject(TOKEN)` pattern maps perfectly to the domain interface / infrastructure implementation split
3. **Global pipes/filters/interceptors** replace most Express middleware — `ValidationPipe`, `GlobalExceptionFilter`, `ContextInterceptor` cover what previously required 5+ middleware functions
4. **Nx caching is significant** — builds that previously took 10+ seconds now complete in <1 second when cached
5. **Per-service databases** — `DatabaseModule.forRoot({ connectionPrefix })` pattern cleanly supports per-service database connections with independent connection strings

---

## 8. Architecture Summary (Current State)

```
BACKEND/ (Nx + pnpm workspace)
├── apps/
│   ├── user-service/         Clean Architecture (4 layers), port 3001, DB: user_service_db
│   ├── auth-service/         Clean Architecture (4 layers), port 3002, DB: auth_db
│   └── api-portal/            Swagger aggregator + reverse proxy, port 4000
├── libs/
│   ├── domain/               BaseEntity, IBaseRepository, PaginationOptions
│   ├── api/                  MessageCode, ApiResponse, Exceptions
│   ├── shared/               DatabaseModule (Knex)
│   └── infrastructure/       Auth, Context, BaseRepository, Realtime, Logger, Filter
├── keycloak/
│   └── cargoez-realm.json    Realm config (4 clients, 3 users, 3 roles)
└── .env                      Per-service database names, Keycloak config
```

---

## Related Documentation

- [README.md](./README.md) — Project overview and how to run
- [PACKAGES.md](./PACKAGES.md) — Shared libraries reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) — Full development guide
- [AUTHENTICATION.md](./AUTHENTICATION.md) — Keycloak auth guide
- [ERROR_CODES.md](./ERROR_CODES.md) — Message codes reference
