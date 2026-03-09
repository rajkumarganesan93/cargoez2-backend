import { BaseEntity } from '@cargoez/domain';

export interface Permission extends BaseEntity {
  moduleId: string;
  screenId: string;
  operationId: string;
  permissionKey: string;
}
