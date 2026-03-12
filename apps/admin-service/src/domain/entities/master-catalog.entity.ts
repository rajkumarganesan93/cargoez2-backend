import { BaseEntity } from '@cargoez/domain';

export interface ModuleCatalogEntity extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export interface OperationCatalogEntity extends BaseEntity {
  code: string;
  name: string;
  description?: string;
}
