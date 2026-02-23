import type { BaseEntity } from '@cargoez2/domain';

export interface User extends BaseEntity {
  email: string;
  passwordHash: string;
  roleId: string;
}
