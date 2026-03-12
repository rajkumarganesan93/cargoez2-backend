import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './permissions.decorator';
import { AbacEvaluator, AbacContext } from './abac-evaluator';
import { getContextOrNull, RequestContext } from '../context/request-context';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('No user context');

    // Read from request object (set by ContextGuard) or AsyncLocalStorage fallback
    const reqCtx: RequestContext | null = request.requestContext || getContextOrNull();
    const permissions = reqCtx?.permissions ?? [];

    if (permissions.some((p) => p.key === '*')) return true;

    const matchedPerm = permissions.find((p) => p.key === requiredPermission);
    if (!matchedPerm) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`);
    }

    if (matchedPerm.conditions) {
      const abacContext: AbacContext = {
        userId: user.sub || user.preferred_username || 'anonymous',
        tenantId: reqCtx?.tenantUid,
        roles: user?.realm_access?.roles || [],
        department: user.department,
      };

      const result = AbacEvaluator.evaluate(matchedPerm.conditions, abacContext, request.body);
      if (!result.allowed) {
        throw new ForbiddenException('ABAC conditions not met');
      }

      if (result.filters) {
        request.abacFilters = result.filters;
      }
    }

    return true;
  }
}
