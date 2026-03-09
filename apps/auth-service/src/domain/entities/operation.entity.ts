import { BaseEntity } from '@cargoez/domain';

export interface Operation extends BaseEntity {
  code: string;
  name: string;
  description?: string;
}
