import type { PaginatedResult, ListOptions } from '@rajkumarganesan93/domain';
import type { User } from '../../domain/entities/User.js';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';

export class GetAllUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(options?: ListOptions): Promise<PaginatedResult<User>> {
    return this.userRepository.findAll(options);
  }
}
