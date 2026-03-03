import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  roles: string[];
  tenantId?: string;
  timestamp: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Execute `fn` within an isolated request context scope.
 * All async code called from within `fn` can access the context
 * via `getContext()` without explicit parameter passing.
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Returns the current request context.
 * Throws if called outside a context scope (e.g., during startup or in scripts).
 */
export function getContext(): RequestContext {
  const ctx = asyncLocalStorage.getStore();
  if (!ctx) {
    throw new Error('RequestContext not available — called outside a request scope');
  }
  return ctx;
}

/** Returns the current request context, or `null` if none is active. */
export function getContextOrNull(): RequestContext | null {
  return asyncLocalStorage.getStore() ?? null;
}

/** Shorthand: returns the authenticated user's ID, or throws if no context. */
export function getCurrentUserId(): string {
  return getContext().userId;
}

/** Shorthand: returns the tenant ID from context, or `undefined`. */
export function getCurrentTenantId(): string | undefined {
  return getContext().tenantId;
}

/** Safe version: returns the user ID or `undefined` if no context is active. */
export function getCurrentUserIdOrNull(): string | undefined {
  return getContextOrNull()?.userId;
}

/** Safe version: returns the tenant ID or `undefined` if no context is active. */
export function getCurrentTenantIdOrNull(): string | undefined {
  return getContextOrNull()?.tenantId;
}
