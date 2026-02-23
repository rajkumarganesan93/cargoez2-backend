import type { BaseEntity } from '@cargoez2/domain';

export interface User extends BaseEntity {
  name: string;
  email: string;
}
