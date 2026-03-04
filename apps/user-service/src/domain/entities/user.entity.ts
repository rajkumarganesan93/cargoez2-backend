import { BaseEntity } from '@cargoez/domain';

export interface User extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
}
