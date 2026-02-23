export interface AuditEntry {
  id?: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  serviceName: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditRecordInput {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  serviceName: string;
  ip?: string;
  userAgent?: string;
}
