import type { BaseEntity } from '@rajkumarganesan93/domain';

export interface Country extends BaseEntity {
  code: string;
  name: string;
}
