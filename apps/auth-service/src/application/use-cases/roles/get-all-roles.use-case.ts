import { Inject, Injectable } from '@nestjs/common';
import { PaginationOptions, PaginatedResult } from '@cargoez/domain';
import { Role } from '../../../domain/entities/role.entity';
import { IRoleRepository, ROLE_REPOSITORY } from '../../../domain/repositories/role-repository.interface';

@Injectable()
export class GetAllRolesUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository) {}

  execute(options: PaginationOptions): Promise<PaginatedResult<Role>> {
    return this.roleRepo.findAll(options);
  }
}
