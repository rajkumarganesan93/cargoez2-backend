import { EventEmitter } from 'events';

export interface DomainEvent {
  entity: string;
  action: string;
  entityId: string;
  data: any;
  actor: string;
  tenantId?: string;
  timestamp: Date;
}

class DomainEventBus {
  private emitter = new EventEmitter();

  emit(event: DomainEvent): void {
    this.emitter.emit('domain-event', event);
  }

  on(listener: (event: DomainEvent) => void): void {
    this.emitter.on('domain-event', listener);
  }

  off(listener: (event: DomainEvent) => void): void {
    this.emitter.off('domain-event', listener);
  }
}

export const domainEventBus = new DomainEventBus();
