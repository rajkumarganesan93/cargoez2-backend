import { Inject, Injectable } from '@nestjs/common';
import { PaginationOptions, PaginatedResult } from '@cargoez/domain';
import { Permission } from '../../../domain/entities/permission.entity';
import { IPermissionRepository, PERMISSION_REPOSITORY } from '../../../domain/repositories/permission-repository.interface';

@Injectable()
export class GetAllPermissionsUseCase {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly permissionRepo: IPermissionRepository) {}

  execute(options: PaginationOptions): Promise<PaginatedResult<Permission>> {
    return this.permissionRepo.findAll(options);
  }
}
