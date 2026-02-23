import type { ITokenRepository } from '../../domain/repositories/ITokenRepository.js';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';

export interface ValidateTokenResult {
  valid: boolean;
  userId?: string;
}

export class ValidateTokenUseCase {
  constructor(
    private readonly tokenRepository: ITokenRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(tokenValue: string): Promise<ValidateTokenResult> {
    const token = await this.tokenRepository.findByValue(tokenValue);
    if (!token) {
      return { valid: false };
    }
    if (new Date() > token.expiresAt) {
      return { valid: false };
    }
    const user = await this.userRepository.findById(token.userId);
    if (!user) {
      return { valid: false };
    }
    return { valid: true, userId: user.id };
  }
}
