import { BaseEntity } from '@cargoez/domain';

export interface BranchEntity extends BaseEntity {
  code: string;
  name: string;
  address?: string;
  city?: string;
  countryUid?: string;
}
