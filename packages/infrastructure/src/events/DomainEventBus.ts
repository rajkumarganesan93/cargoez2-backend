import { EventEmitter } from 'node:events';

export interface DomainEvent {
  entity: string;
  action: 'created' | 'updated' | 'deleted';
  entityId: string;
  data?: Record<string, unknown>;
  actor: string;
  tenantId?: string;
  timestamp: string;
}

/**
 * In-process event bus for domain events. Backed by Node.js EventEmitter.
 *
 * BaseRepository emits events automatically after save/update/delete.
 * The Socket.IO layer subscribes to these events and broadcasts them
 * to connected clients in the appropriate rooms.
 *
 * Services can also emit custom events directly:
 *   domainEventBus.emitDomainEvent({ entity: 'orders', action: 'updated', ... });
 */
class DomainEventBusClass extends EventEmitter {
  emitDomainEvent(event: DomainEvent): void {
    this.emit('domain.event', event);
  }

  onDomainEvent(handler: (event: DomainEvent) => void): this {
    this.on('domain.event', handler);
    return this;
  }

  offDomainEvent(handler: (event: DomainEvent) => void): this {
    this.off('domain.event', handler);
    return this;
  }
}

export const domainEventBus = new DomainEventBusClass();
