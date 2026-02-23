/**
 * Base entity with common audit fields. All domain entities extend this.
 * All properties use camelCase only.
 *
 * Date fields are typed as `string` (ISO 8601) because database drivers
 * and JSON serialization return strings, not native Date objects.
 */
export interface BaseEntity {
  id: string;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
  createdBy?: string;
  modifiedBy?: string;
  tenantId?: string;
}
