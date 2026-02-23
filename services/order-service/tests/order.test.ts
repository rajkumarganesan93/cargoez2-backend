import request from 'supertest';
import express from 'express';
import { createOrderRoutes } from '../src/presentation/routes.js';
import { OrderController } from '../src/presentation/controllers/OrderController.js';
import { CreateOrderUseCase } from '../src/application/use-cases/CreateOrderUseCase.js';
import { GetOrderByIdUseCase } from '../src/application/use-cases/GetOrderByIdUseCase.js';

const mockOrders: Map<
  string,
  { id: string; userId: string; totalAmount: number; status: string; createdAt: Date }
> = new Map();
const createOrderUseCase = new CreateOrderUseCase({
  findById: async (id) => mockOrders.get(id) ?? null,
  save: async (input) => {
    const id = crypto.randomUUID();
    const order = {
      id,
      userId: input.userId,
      totalAmount: input.totalAmount,
      status: input.status || 'pending',
      createdAt: new Date(),
    };
    mockOrders.set(id, order);
    return order;
  },
});
const getOrderByIdUseCase = new GetOrderByIdUseCase({
  findById: async (id) => mockOrders.get(id) ?? null,
  save: async () => ({
    id: '',
    userId: '',
    totalAmount: 0,
    status: '',
    createdAt: new Date(),
  }),
});
const controller = new OrderController(createOrderUseCase, getOrderByIdUseCase);

const app = express();
app.use(express.json());
app.use(createOrderRoutes(controller));

describe('Order Service', () => {
  beforeEach(() => mockOrders.clear());

  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /orders creates order and GET /orders/:id returns it', async () => {
    const createRes = await request(app)
      .post('/orders')
      .send({ userId: 'user-1', totalAmount: 99.99, status: 'pending' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.userId).toBe('user-1');
    expect(createRes.body.totalAmount).toBe(99.99);
    expect(createRes.body.id).toBeDefined();

    const getRes = await request(app).get(`/orders/${createRes.body.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.userId).toBe('user-1');
    expect(getRes.body.totalAmount).toBe(99.99);
  });

  it('POST /orders without totalAmount returns 400', async () => {
    const res = await request(app).post('/orders').send({ userId: 'user-1' });
    expect(res.status).toBe(400);
  });
});
