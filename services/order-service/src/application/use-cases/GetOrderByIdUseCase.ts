import type { IOrderRepository } from '../../domain/repositories/IOrderRepository.js';
import type { Order } from '../../domain/entities/Order.js';

export class GetOrderByIdUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(id: string): Promise<Order | null> {
    return this.orderRepository.findById(id);
  }
}
