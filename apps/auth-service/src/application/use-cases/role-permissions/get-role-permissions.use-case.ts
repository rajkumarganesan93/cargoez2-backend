import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { RolePermission } from '../../../domain/entities/role-permission.entity';
import { IRolePermissionRepository, ROLE_PERMISSION_REPOSITORY } from '../../../domain/repositories/role-permission-repository.interface';
import { IRoleRepository, ROLE_REPOSITORY } from '../../../domain/repositories/role-repository.interface';

@Injectable()
export class GetRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_PERMISSION_REPOSITORY) private readonly rolePermRepo: IRolePermissionRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(roleId: string): Promise<RolePermission[]> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new NotFoundException('Role');
    return this.rolePermRepo.findByRoleId(roleId);
  }
}
