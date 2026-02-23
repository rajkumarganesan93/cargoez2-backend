import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { User } from '../../domain/entities/User.js';

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}
