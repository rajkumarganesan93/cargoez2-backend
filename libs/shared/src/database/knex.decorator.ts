import { Inject } from '@nestjs/common';
import { KNEX_CONNECTION } from './database.module';

export const InjectKnex = () => Inject(KNEX_CONNECTION);
