import type { BaseEntity } from '@rajkumarganesan93/domain';

export interface User extends BaseEntity {
  name: string;
  email: string;
}
