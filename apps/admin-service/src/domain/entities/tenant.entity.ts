import { BaseEntity } from '@cargoez/domain';

export interface TenantEntity extends BaseEntity {
  code: string;
  name: string;
  tenantTypeUid?: string;
  countryUid?: string;
  dbStrategy: string;
  dbHost?: string;
  dbPort?: number;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
  logoUrl?: string;
}
