import { pool } from '../db.js';
import type { IOrderRepository, CreateOrderInput } from '../../domain/repositories/IOrderRepository.js';
import type { Order } from '../../domain/entities/Order.js';

export class OrderRepository implements IOrderRepository {
  async findById(id: string): Promise<Order | null> {
    const result = await pool.query(
      'SELECT id, user_id, total_amount, status, created_at FROM orders WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.toEntity(row);
  }

  async save(input: CreateOrderInput): Promise<Order> {
    const result = await pool.query(
      `INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3)
       RETURNING id, user_id, total_amount, status, created_at`,
      [input.userId, input.totalAmount, input.status || 'pending']
    );
    return this.toEntity(result.rows[0]);
  }

  private toEntity(row: {
    id: string;
    user_id: string;
    total_amount: string;
    status: string;
    created_at: Date;
  }): Order {
    return {
      id: row.id,
      userId: row.user_id,
      totalAmount: parseFloat(row.total_amount),
      status: row.status,
      createdAt: row.created_at,
    };
  }
}
