import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { v4 as uuidv4 } from 'uuid';
import { IS_PUBLIC_KEY } from './public.decorator';
import { runWithContext, RequestContext, ResolvedPermission, TenantDbConnection } from '../context/request-context';

interface CachedContext {
  tenantUid: string | null;
  branchUid: string | null;
  userType: 'sys_admin' | 'app_customer' | 'branch_customer';
  permissions: ResolvedPermission[];
  dbConnection?: TenantDbConnection;
  expiresAt: number;
}

const contextCache = new Map<string, CachedContext>();
const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ContextGuard implements CanActivate {
  private adminServiceUrl: string;

  constructor(private reflector: Reflector) {
    const port = process.env['ADMIN_SERVICE_PORT'] || '3001';
    this.adminServiceUrl = process.env['ADMIN_SERVICE_URL'] || `http://localhost:${port}`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user;

    const requestId = uuidv4();
    response.setHeader('X-Request-Id', requestId);

    const cacheKey = user?.sub || user?.email || user?.preferred_username;
    let resolvedCtx: CachedContext | null = null;

    if (cacheKey) {
      resolvedCtx = this.getCached(cacheKey);
      if (!resolvedCtx) {
        const lookups = [user?.sub, user?.email, user?.preferred_username].filter(Boolean);
        for (const key of lookups) {
          resolvedCtx = await this.fetchContext(key!);
          if (resolvedCtx) {
            contextCache.set(cacheKey, resolvedCtx);
            break;
          }
        }
      }
    }

    const ctx: RequestContext = {
      requestId,
      userId: user?.sub || user?.preferred_username || undefined,
      userEmail: user?.email || undefined,
      tenantUid: resolvedCtx?.tenantUid ?? undefined,
      branchUid: resolvedCtx?.branchUid ?? undefined,
      userType: resolvedCtx?.userType,
      permissions: resolvedCtx?.permissions ?? [],
      dbConnection: resolvedCtx?.dbConnection,
      timestamp: new Date(),
      abacFilters: request.abacFilters || undefined,
    };

    // Store context on the request object so the PermissionsGuard and interceptors can access it
    request.requestContext = ctx;

    return true;
  }

  private getCached(keycloakSub: string): CachedContext | null {
    const entry = contextCache.get(keycloakSub);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      contextCache.delete(keycloakSub);
      return null;
    }
    return entry;
  }

  private async fetchContext(keycloakSub: string): Promise<CachedContext | null> {
    try {
      const url = `${this.adminServiceUrl}/admin-service/internal/resolve-context?keycloak_sub=${encodeURIComponent(keycloakSub)}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data: any = await response.json();
      return {
        tenantUid: data.tenantUid ?? null,
        branchUid: data.branchUid ?? null,
        userType: data.userType ?? 'app_customer',
        permissions: (data.permissions ?? []).map((p: any) => ({
          key: p.key,
          conditions: p.conditions ?? undefined,
        })),
        dbConnection: data.dbConnection ?? undefined,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
    } catch (error) {
      console.error('Failed to resolve context from admin-service:', error);
      return null;
    }
  }
}
