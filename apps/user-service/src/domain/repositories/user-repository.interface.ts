import { IBaseRepository } from '@cargoez/domain';
import { User } from '../entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export type IUserRepository = IBaseRepository<User>;
