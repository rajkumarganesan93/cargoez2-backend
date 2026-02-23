import type { IOrderRepository } from '../../domain/repositories/IOrderRepository.js';
import type { Order } from '../../domain/entities/Order.js';

export interface CreateOrderInput {
  userId: string;
  totalAmount: number;
  status: string;
}

export class CreateOrderUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    return this.orderRepository.save({
      ...input,
      status: input.status || 'pending',
    });
  }
}
