/**
 * Base entity with common audit fields. All domain entities extend this.
 * All properties use camelCase only.
 */
export interface BaseEntity {
  id: string;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date;
  createdBy?: string;
  modifiedBy?: string;
  tenantId?: string;
}
