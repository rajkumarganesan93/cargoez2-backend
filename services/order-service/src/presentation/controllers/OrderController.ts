import { Request, Response } from 'express';
import { CreateOrderUseCase } from '../../application/use-cases/CreateOrderUseCase.js';
import { GetOrderByIdUseCase } from '../../application/use-cases/GetOrderByIdUseCase.js';

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase
  ) {}

  create = async (req: Request, res: Response): Promise<Response> => {
    const { userId, totalAmount, status } = req.body;
    if (!userId || totalAmount == null) {
      return res.status(400).json({ error: 'userId and totalAmount are required' });
    }
    try {
      const order = await this.createOrderUseCase.execute({
        userId,
        totalAmount: Number(totalAmount),
        status: status || 'pending',
      });
      return res.status(201).json({
        id: order.id,
        userId: order.userId,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order';
      return res.status(500).json({ error: message });
    }
  };

  getById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const order = await this.getOrderByIdUseCase.execute(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(200).json({
      id: order.id,
      userId: order.userId,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    });
  };
}
