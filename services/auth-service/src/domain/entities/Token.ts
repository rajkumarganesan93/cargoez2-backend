import type { BaseEntity } from '@cargoez2/domain';

export interface Token extends BaseEntity {
  userId: string;
  value: string;
  expiresAt: Date;
}
