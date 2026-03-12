import { BaseEntity } from '@cargoez/domain';

export interface ContactEntity extends BaseEntity {
  contactType: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  notes?: string;
}
