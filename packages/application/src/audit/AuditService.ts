import type { IAuditRepository } from './IAuditRepository.js';
import type { AuditEntry, AuditRecordInput } from './types.js';

export class AuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async record(input: AuditRecordInput): Promise<void> {
    const entry: AuditEntry = {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      metadata: input.metadata,
      timestamp: new Date(),
      serviceName: input.serviceName,
      ip: input.ip,
      userAgent: input.userAgent,
    };
    await this.auditRepository.save(entry);
  }
}
