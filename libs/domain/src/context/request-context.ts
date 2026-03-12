import { AsyncLocalStorage } from 'async_hooks';

export interface ResolvedPermission {
  key: string;
  conditions?: Record<string, any>;
}

export interface TenantDbConnection {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  strategy: 'shared' | 'dedicated';
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  userEmail?: string;
  tenantUid?: string;
  branchUid?: string;
  userType?: 'sys_admin' | 'app_customer' | 'branch_customer';
  permissions: ResolvedPermission[];
  dbConnection?: TenantDbConnection;
  timestamp: Date;
  abacFilters?: Record<string, any>;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function runWithContext(context: RequestContext, fn: () => void): void {
  asyncLocalStorage.run(context, fn);
}

export function getContext(): RequestContext {
  const ctx = asyncLocalStorage.getStore();
  if (!ctx) throw new Error('No request context available');
  return ctx;
}

export function getContextOrNull(): RequestContext | null {
  return asyncLocalStorage.getStore() ?? null;
}

export function getCurrentUserId(): string {
  return getContext().userId ?? 'anonymous';
}

export function getCurrentUserIdOrNull(): string | null {
  return getContextOrNull()?.userId ?? null;
}

export function getCurrentTenantUid(): string | undefined {
  return getContext().tenantUid;
}

export function getCurrentTenantUidOrNull(): string | null {
  return getContextOrNull()?.tenantUid ?? null;
}
