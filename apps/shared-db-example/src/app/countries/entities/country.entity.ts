import { BaseEntity } from '@cargoez/domain';

export interface Country extends BaseEntity {
  name: string;
  code: string;
}
