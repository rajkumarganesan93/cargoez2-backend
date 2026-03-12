import { BaseEntity } from '@cargoez/domain';

export interface AppCustomerCredentialEntity extends BaseEntity {
  appCustomerUid: string;
  credentialType: string;
  credentialValue: string;
  expiresAt?: Date;
}
