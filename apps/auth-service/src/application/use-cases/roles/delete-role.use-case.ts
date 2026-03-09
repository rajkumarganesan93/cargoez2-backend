import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException, AppException } from '@cargoez/api';
import { MessageCode } from '@cargoez/api';
import { IRoleRepository, ROLE_REPOSITORY } from '../../../domain/repositories/role-repository.interface';

@Injectable()
export class DeleteRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.roleRepo.findById(id);
    if (!existing) throw new NotFoundException('Role');
    if (existing.isSystem) throw new AppException(MessageCode.FORBIDDEN, 'Cannot delete system role');
    return this.roleRepo.delete(id);
  }
}
