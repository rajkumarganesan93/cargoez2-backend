import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';
import { BaseRepository } from '@cargoez/infrastructure';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, 'users');
  }
}
