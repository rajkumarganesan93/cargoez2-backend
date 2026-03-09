import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { IRolePermissionRepository, ROLE_PERMISSION_REPOSITORY } from '../../../domain/repositories/role-permission-repository.interface';

@Injectable()
export class RevokePermissionUseCase {
  constructor(
    @Inject(ROLE_PERMISSION_REPOSITORY) private readonly rolePermRepo: IRolePermissionRepository,
  ) {}

  async execute(roleId: string, permissionId: string): Promise<void> {
    const existing = await this.rolePermRepo.findByRoleAndPermission(roleId, permissionId);
    if (!existing) throw new NotFoundException('RolePermission');
    return this.rolePermRepo.delete(existing.id);
  }
}
