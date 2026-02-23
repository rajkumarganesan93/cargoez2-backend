import { ConflictError } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';
import type { IUserRepository, UpdateUserInput } from '../../domain/repositories/IUserRepository.js';
import type { User } from '../../domain/entities/User.js';

export class UpdateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string, input: UpdateUserInput): Promise<User | null> {
    const existing = await this.userRepository.findById(id);
    if (!existing) return null;
    if (input.email && input.email !== existing.email) {
      const byEmail = await this.userRepository.findOne({ email: input.email });
      if (byEmail) throw new ConflictError(MessageCode.DUPLICATE_EMAIL, { email: input.email });
    }
    return this.userRepository.update(id, input);
  }
}
