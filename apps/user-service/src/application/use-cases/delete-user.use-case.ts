import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@cargoez/api';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';

@Injectable()
export class DeleteUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.userRepo.findById(id);
    if (!existing) throw new NotFoundException('User');
    return this.userRepo.delete(id);
  }
}
