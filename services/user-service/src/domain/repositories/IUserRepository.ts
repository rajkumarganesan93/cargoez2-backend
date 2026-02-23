import type { IRepository } from '@rajkumarganesan93/domain';
import type { User } from '../entities/User.js';

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}

export interface IUserRepository extends IRepository<User, CreateUserInput, UpdateUserInput> {}
