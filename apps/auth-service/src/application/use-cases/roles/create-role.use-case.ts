import { Inject, Injectable } from '@nestjs/common';
import { AlreadyExistsException } from '@cargoez/api';
import { Role } from '../../../domain/entities/role.entity';
import { IRoleRepository, ROLE_REPOSITORY } from '../../../domain/repositories/role-repository.interface';

@Injectable()
export class CreateRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository) {}

  async execute(data: { name: string; description?: string }): Promise<Role> {
    const existing = await this.roleRepo.findByName(data.name);
    if (existing) throw new AlreadyExistsException('Role');
    return this.roleRepo.save({ ...data, isSystem: false, isActive: true } as Partial<Role>);
  }
}
