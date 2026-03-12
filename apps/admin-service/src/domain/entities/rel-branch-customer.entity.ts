import { BaseEntity } from '@cargoez/domain';

export interface RelBranchCustomerEntity extends BaseEntity {
  branchUid: string;
  branchCustomerUid: string;
}
