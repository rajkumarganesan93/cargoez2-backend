import { BaseEntity } from '@cargoez/domain';

export interface MetaDataEntity extends BaseEntity {
  code: string;
  name: string;
  description?: string;
}

export interface MetaDataDetailEntity extends BaseEntity {
  metaDataUid: string;
  code: string;
  name: string;
  value?: string;
  sortOrder: number;
}
