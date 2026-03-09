import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { IPermissionRepository, PERMISSION_REPOSITORY } from '../../../domain/repositories/permission-repository.interface';

@Injectable()
export class DeletePermissionUseCase {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly permissionRepo: IPermissionRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.permissionRepo.findById(id);
    if (!existing) throw new NotFoundException('Permission');
    return this.permissionRepo.delete(id);
  }
}
