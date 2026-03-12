import { BaseEntity } from '@cargoez/domain';

export interface SysAdminEntity extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  keycloakSub: string;
}
