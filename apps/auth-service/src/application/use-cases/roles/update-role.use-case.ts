import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { Role } from '../../../domain/entities/role.entity';
import { IRoleRepository, ROLE_REPOSITORY } from '../../../domain/repositories/role-repository.interface';

@Injectable()
export class UpdateRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository) {}

  async execute(id: string, data: Partial<Role>): Promise<Role> {
    const existing = await this.roleRepo.findById(id);
    if (!existing) throw new NotFoundException('Role');
    return this.roleRepo.update(id, data);
  }
}
