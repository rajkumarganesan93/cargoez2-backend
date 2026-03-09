import { BaseEntity } from '@cargoez/domain';

export interface AppModule extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}
