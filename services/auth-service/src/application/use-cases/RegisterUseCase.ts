import { BadRequestError, ConflictError } from '@rajkumarganesan93/infrastructure';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IRoleRepository } from '../../domain/repositories/IRoleRepository.js';
import type { User } from '../../domain/entities/User.js';

export interface RegisterInput {
  email: string;
  password: string;
  roleName?: string;
}

export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly roleRepository: IRoleRepository
  ) {}

  async execute(input: RegisterInput): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }
    const role = await this.roleRepository.findByName(input.roleName ?? 'user');
    if (!role) {
      throw new BadRequestError('Role not found');
    }
    // In a real app, hash password (e.g. bcrypt). For scaffold we store a placeholder.
    const passwordHash = `hash:${input.password}`;
    const user = await this.userRepository.save({
      email: input.email,
      passwordHash,
      roleId: role.id,
    });
    return {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      modifiedAt: user.modifiedAt,
    };
  }
}
