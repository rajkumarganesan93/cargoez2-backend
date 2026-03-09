import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException, AlreadyExistsException } from '@cargoez/api';
import { RolePermission, AbacConditions } from '../../../domain/entities/role-permission.entity';
import { IRolePermissionRepository, ROLE_PERMISSION_REPOSITORY } from '../../../domain/repositories/role-permission-repository.interface';
import { IRoleRepository, ROLE_REPOSITORY } from '../../../domain/repositories/role-repository.interface';
import { IPermissionRepository, PERMISSION_REPOSITORY } from '../../../domain/repositories/permission-repository.interface';

@Injectable()
export class AssignPermissionUseCase {
  constructor(
    @Inject(ROLE_PERMISSION_REPOSITORY) private readonly rolePermRepo: IRolePermissionRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissionRepo: IPermissionRepository,
  ) {}

  async execute(data: { roleId: string; permissionId: string; conditions?: AbacConditions | null }): Promise<RolePermission> {
    const role = await this.roleRepo.findById(data.roleId);
    if (!role) throw new NotFoundException('Role');

    const permission = await this.permissionRepo.findById(data.permissionId);
    if (!permission) throw new NotFoundException('Permission');

    const existing = await this.rolePermRepo.findByRoleAndPermission(data.roleId, data.permissionId);
    if (existing) throw new AlreadyExistsException('RolePermission');

    return this.rolePermRepo.save({
      roleId: data.roleId,
      permissionId: data.permissionId,
      conditions: data.conditions ?? null,
    } as Partial<RolePermission>);
  }
}
