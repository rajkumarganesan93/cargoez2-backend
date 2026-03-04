import { Injectable } from '@nestjs/common';
import { PaginationOptions, PaginatedResult } from '@cargoez/domain';
import { NotFoundException } from '@cargoez/api';
import { UsersRepository } from './users.repository';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll(options: PaginationOptions): Promise<PaginatedResult<User>> {
    return this.usersRepository.findAll(options);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User');
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    return this.usersRepository.save({ ...dto, id: undefined } as any);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findById(id);
    return this.usersRepository.update(id, dto as any);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    return this.usersRepository.delete(id);
  }
}
