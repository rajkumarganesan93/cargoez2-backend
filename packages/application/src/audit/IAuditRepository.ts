import type { AuditEntry } from './types.js';

export interface IAuditRepository {
  save(entry: Omit<AuditEntry, 'id'>): Promise<void>;
  findById?(id: string): Promise<AuditEntry | null>;
  findByEntity?(entityType: string, entityId: string): Promise<AuditEntry[]>;
}
