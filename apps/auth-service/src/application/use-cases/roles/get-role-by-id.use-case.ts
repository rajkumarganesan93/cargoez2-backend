import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { Role } from '../../../domain/entities/role.entity';
import { IRoleRepository, ROLE_REPOSITORY } from '../../../domain/repositories/role-repository.interface';

@Injectable()
export class GetRoleByIdUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository) {}

  async execute(id: string): Promise<Role> {
    const role = await this.roleRepo.findById(id);
    if (!role) throw new NotFoundException('Role');
    return role;
  }
}
