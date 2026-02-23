import type { User } from '../entities/User.js';
import type { PaginatedResult, ListOptions } from '@cargoez2/domain';

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}

export interface IUserRepository {
  findAll(options?: ListOptions): Promise<PaginatedResult<User>>;
  findById(id: string): Promise<User | null>;
  save(input: CreateUserInput): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  findByEmail(email: string): Promise<User | null>;
}
