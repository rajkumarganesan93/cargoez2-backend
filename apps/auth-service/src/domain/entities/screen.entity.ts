import { BaseEntity } from '@cargoez/domain';

export interface Screen extends BaseEntity {
  moduleId: string;
  code: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}
