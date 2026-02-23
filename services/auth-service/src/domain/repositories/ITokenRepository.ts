import type { Token } from '../entities/Token.js';

export interface ITokenRepository {
  findByValue(value: string): Promise<Token | null>;
  save(input: { userId: string; value: string; expiresAt: Date }): Promise<Token>;
  deleteByValue(value: string): Promise<void>;
}
