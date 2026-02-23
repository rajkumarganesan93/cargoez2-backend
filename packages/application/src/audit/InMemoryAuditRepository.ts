import type { IAuditRepository } from './IAuditRepository.js';
import type { AuditEntry } from './types.js';

export class InMemoryAuditRepository implements IAuditRepository {
  private readonly entries: AuditEntry[] = [];

  async save(entry: Omit<AuditEntry, 'id'>): Promise<void> {
    this.entries.push({ ...entry, id: crypto.randomUUID() });
  }
}
