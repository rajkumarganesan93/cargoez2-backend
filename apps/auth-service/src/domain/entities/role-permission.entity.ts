import { BaseEntity } from '@cargoez/domain';

export interface AbacConditions {
  tenant_isolation?: boolean;
  ownership_only?: boolean;
  department?: string[];
  max_amount?: number;
  time_window?: { from: string; to: string };
  custom_rules?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte';
    values: any[];
  }>;
}

export interface RolePermission extends BaseEntity {
  roleId: string;
  permissionId: string;
  conditions?: AbacConditions | null;
}
