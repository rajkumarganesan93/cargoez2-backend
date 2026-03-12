export interface BaseEntity {
  uid: string;
  tenantUid?: string;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date;
  createdBy?: string;
  modifiedBy?: string;
}
