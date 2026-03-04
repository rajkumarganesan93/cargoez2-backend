import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  userEmail?: string;
  roles: string[];
  tenantId?: string;
  timestamp: Date;
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

export function getCurrentTenantId(): string | undefined {
  return getContext().tenantId;
}

export function getCurrentTenantIdOrNull(): string | null {
  return getContextOrNull()?.tenantId ?? null;
}
