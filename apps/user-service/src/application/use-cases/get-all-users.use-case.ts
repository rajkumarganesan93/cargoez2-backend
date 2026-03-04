import { Inject, Injectable } from '@nestjs/common';
import { PaginationOptions, PaginatedResult } from '@cargoez/domain';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';

@Injectable()
export class GetAllUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  execute(options: PaginationOptions): Promise<PaginatedResult<User>> {
    return this.userRepo.findAll(options);
  }
}
