import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './permissions.decorator';
import { PermissionCache } from './permission-cache';
import { AbacEvaluator, AbacContext } from './abac-evaluator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private authServiceUrl: string;

  constructor(private reflector: Reflector) {
    const port = process.env['AUTH_SERVICE_PORT'] || '3002';
    this.authServiceUrl = `http://localhost:${port}/auth-service`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('No user context');

    const userRoles: string[] = user?.realm_access?.roles || [];
    if (userRoles.length === 0) throw new ForbiddenException('No roles assigned');

    let permissions = PermissionCache.get(userRoles);
    if (!permissions) {
      permissions = await this.fetchPermissions(userRoles);
      PermissionCache.set(userRoles, permissions);
    }

    const matchedPerm = permissions.find((p) => p.key === requiredPermission);
    if (!matchedPerm) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`);
    }

    const abacContext: AbacContext = {
      userId: user.sub || user.preferred_username || 'anonymous',
      tenantId: user.tenant_id,
      roles: userRoles,
      department: user.department,
    };

    const result = AbacEvaluator.evaluate(matchedPerm.conditions, abacContext, request.body);
    if (!result.allowed) {
      throw new ForbiddenException('ABAC conditions not met');
    }

    if (result.filters) {
      request.abacFilters = result.filters;
    }

    return true;
  }

  private async fetchPermissions(roles: string[]): Promise<Array<{ key: string; conditions: Record<string, any> | null }>> {
    try {
      const url = `${this.authServiceUrl}/resolve-permissions?roles=${roles.join(',')}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Auth service returned ${response.status}`);
      }
      const body: any = await response.json();
      return body?.data?.permissions || [];
    } catch (error) {
      console.error('Failed to fetch permissions from auth-service:', error);
      return [];
    }
  }
}
