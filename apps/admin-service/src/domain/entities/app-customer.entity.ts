import { BaseEntity } from '@cargoez/domain';

export interface AppCustomerEntity extends BaseEntity {
  branchUid?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  keycloakSub?: string;
}
