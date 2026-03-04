import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';

@Injectable()
export class UpdateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(id: string, data: Partial<User>): Promise<User> {
    const existing = await this.userRepo.findById(id);
    if (!existing) throw new NotFoundException('User');
    return this.userRepo.update(id, data);
  }
}
