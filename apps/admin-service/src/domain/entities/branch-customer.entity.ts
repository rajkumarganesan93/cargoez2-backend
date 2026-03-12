import { BaseEntity } from '@cargoez/domain';

export interface BranchCustomerEntity extends BaseEntity {
  companyName?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}
