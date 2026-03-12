import { BaseEntity } from '@cargoez/domain';

export interface ProductEntity extends BaseEntity {
  code: string;
  name: string;
  description?: string;
}

export interface ProductDetailEntity extends BaseEntity {
  productUid: string;
  detailKey: string;
  detailValue: string;
  sortOrder: number;
}
