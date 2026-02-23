import type { IAuditRepository } from './IAuditRepository.js';
import type { AuditEntry } from './types.js';

export class InMemoryAuditRepository implements IAuditRepository {
  private readonly entries: AuditEntry[] = [];

  async save(entry: Omit<AuditEntry, 'id'>): Promise<void> {
    this.entries.push({ ...entry, id: crypto.randomUUID() });
  }

  getEntries(): readonly AuditEntry[] {
    return this.entries;
  }

  async findById(id: string): Promise<AuditEntry | null> {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditEntry[]> {
    return this.entries.filter(
      (e) => e.entityType === entityType && e.entityId === entityId,
    );
  }
}
