import type { Order } from '../entities/Order.js';

export interface CreateOrderInput {
  userId: string;
  totalAmount: number;
  status: string;
}

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  save(input: CreateOrderInput): Promise<Order>;
}
