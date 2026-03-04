import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';

@Injectable()
export class CreateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  execute(data: { name: string; email: string; phone?: string }): Promise<User> {
    return this.userRepo.save(data as Partial<User>);
  }
}
