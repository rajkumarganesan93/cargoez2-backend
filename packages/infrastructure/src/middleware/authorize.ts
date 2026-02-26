import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './authenticate.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import { MessageCode } from '@rajkumarganesan93/api';

/**
 * Express middleware factory that enforces role-based access control.
 * Checks that the authenticated user has **at least one** of the required roles
 * (from Keycloak `realm_access.roles` or `resource_access.<client>.roles`).
 *
 * Must be placed **after** the `createAuthMiddleware` in the middleware chain.
 *
 * Usage in routes:
 *   router.post('/users', authorize('admin'), validateBody(CreateUserBody), handler);
 *   router.delete('/users/:id', authorize('admin', 'manager'), handler);
 *
 * @param requiredRoles - One or more role names. User must have at least one.
 */
export function authorize(...requiredRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(new UnauthorizedError(MessageCode.UNAUTHORIZED));
    }

    if (requiredRoles.length === 0) {
      return next();
    }

    const allRoles = new Set([...user.realmRoles, ...user.resourceRoles]);
    const hasRole = requiredRoles.some((role) => allRoles.has(role));

    if (!hasRole) {
      return next(new ForbiddenError(MessageCode.FORBIDDEN));
    }

    next();
  };
}
