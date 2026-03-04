export interface BaseEntity {
  id: string;
  createdAt: Date;
  modifiedAt: Date;
  createdBy?: string;
  modifiedBy?: string;
  tenantId?: string;
}
