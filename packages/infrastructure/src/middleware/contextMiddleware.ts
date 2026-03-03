import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { runWithContext, type RequestContext } from '../context/RequestContext.js';
import type { AuthenticatedRequest } from './authenticate.js';

/**
 * Express middleware that creates a RequestContext for every incoming request.
 * Must be placed **after** the auth middleware so `req.user` is populated.
 *
 * The context is stored in AsyncLocalStorage and accessible from any layer
 * via `getContext()` — no need to pass user/tenant info through function params.
 */
export function contextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;

  const context: RequestContext = {
    requestId: randomUUID(),
    userId: user?.sub ?? user?.preferredUsername ?? 'anonymous',
    userEmail: user?.email,
    userName: user?.name ?? user?.preferredUsername,
    roles: user?.realmRoles ?? [],
    tenantId: user?.tokenPayload?.tenant_id as string | undefined
      ?? (req.headers['x-tenant-id'] as string | undefined),
    timestamp: new Date().toISOString(),
  };

  res.setHeader('X-Request-Id', context.requestId);

  runWithContext(context, () => next());
}
