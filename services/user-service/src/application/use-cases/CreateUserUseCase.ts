import { ConflictError } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';
import type { IUserRepository, CreateUserInput } from '../../domain/repositories/IUserRepository.js';
import type { User } from '../../domain/entities/User.js';

export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    const existing = await this.userRepository.findOne({ email: input.email });
    if (existing) {
      throw new ConflictError(MessageCode.DUPLICATE_EMAIL, { email: input.email });
    }
    return this.userRepository.save(input);
  }
}
