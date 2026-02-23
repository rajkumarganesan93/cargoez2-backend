import { UnauthorizedError } from '@rajkumarganesan93/infrastructure';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { ITokenRepository } from '../../domain/repositories/ITokenRepository.js';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  userId: string;
  email: string;
}

const TOKEN_EXPIRY_HOURS = 24;
const TOKEN_BYTES = 32;

function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < TOKEN_BYTES; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: ITokenRepository
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }
    const expectedHash = `hash:${input.password}`;
    if (user.passwordHash !== expectedHash) {
      throw new UnauthorizedError('Invalid email or password');
    }
    const tokenValue = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);
    const token = await this.tokenRepository.save({
      userId: user.id,
      value: tokenValue,
      expiresAt,
    });
    return {
      token: token.value,
      expiresAt: token.expiresAt.toISOString(),
      userId: user.id,
      email: user.email,
    };
  }
}
