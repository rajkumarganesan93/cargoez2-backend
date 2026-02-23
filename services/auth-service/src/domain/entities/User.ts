import type { BaseEntity } from '@rajkumarganesan93/domain';

export interface User extends BaseEntity {
  email: string;
  passwordHash: string;
  roleId: string;
}
