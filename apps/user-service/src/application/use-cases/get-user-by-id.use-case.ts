import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';

@Injectable()
export class GetUserByIdUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('User');
    return user;
  }
}
