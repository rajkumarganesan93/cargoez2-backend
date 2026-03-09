import { Inject, Injectable } from '@nestjs/common';
import {
  IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
  ResolvedPermission,
} from '../../../domain/repositories/role-permission-repository.interface';

@Injectable()
export class ResolvePermissionsUseCase {
  constructor(
    @Inject(ROLE_PERMISSION_REPOSITORY) private readonly rolePermRepo: IRolePermissionRepository,
  ) {}

  execute(roleNames: string[]): Promise<ResolvedPermission[]> {
    return this.rolePermRepo.resolvePermissionsForRoles(roleNames);
  }
}
