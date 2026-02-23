import { ConflictError } from '@rajkumarganesan93/infrastructure';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { User } from '../../domain/entities/User.js';

export interface CreateUserInput {
  name: string;
  email: string;
}

export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }
    return this.userRepository.save(input);
  }
}
