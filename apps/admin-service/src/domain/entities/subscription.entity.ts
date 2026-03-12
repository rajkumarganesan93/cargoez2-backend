import { BaseEntity } from '@cargoez/domain';

export interface SubscriptionEntity extends BaseEntity {
  productUid: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  billingCycle?: string;
}
