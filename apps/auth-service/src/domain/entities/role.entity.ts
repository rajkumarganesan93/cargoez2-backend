import { BaseEntity } from '@cargoez/domain';

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
}
