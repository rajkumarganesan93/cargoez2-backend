import type { User } from '../entities/User.js';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(input: { email: string; passwordHash: string; roleId: string }): Promise<User>;
}
