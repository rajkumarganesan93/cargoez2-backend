import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';

export class DeleteUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }
}
