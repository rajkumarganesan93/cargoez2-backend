import request from 'supertest';
import express from 'express';
import { createLogger } from '@rajkumarganesan93/application';
import { errorHandler } from '@rajkumarganesan93/infrastructure';
import { createUserRoutes } from '../src/presentation/routes.js';
import { UserController } from '../src/presentation/controllers/UserController.js';
import { CreateUserUseCase } from '../src/application/use-cases/CreateUserUseCase.js';
import { GetAllUsersUseCase } from '../src/application/use-cases/GetAllUsersUseCase.js';
import { GetUserByIdUseCase } from '../src/application/use-cases/GetUserByIdUseCase.js';
import { UpdateUserUseCase } from '../src/application/use-cases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from '../src/application/use-cases/DeleteUserUseCase.js';
import type { User } from '../src/domain/entities/User.js';
import type { IUserRepository } from '../src/domain/repositories/IUserRepository.js';

const mockUsers: Map<string, User> = new Map();

const mockRepo: IUserRepository = {
  findAll: async () => {
    const items = Array.from(mockUsers.values());
    return {
      items,
      meta: { total: items.length, page: 1, limit: 20, totalPages: 1 },
    };
  },
  findById: async (id: string) => mockUsers.get(id) ?? null,
  findOne: async (criteria: Record<string, unknown>) => {
    for (const user of mockUsers.values()) {
      const rec = user as unknown as Record<string, unknown>;
      const match = Object.entries(criteria).every(([key, value]) => rec[key] === value);
      if (match) return user;
    }
    return null;
  },
  findMany: async (criteria: Record<string, unknown>) => {
    const items = Array.from(mockUsers.values()).filter((user) => {
      const rec = user as unknown as Record<string, unknown>;
      return Object.entries(criteria).every(([key, value]) => rec[key] === value);
    });
    return {
      items,
      meta: { total: items.length, page: 1, limit: 20, totalPages: 1 },
    };
  },
  save: async (input: { name: string; email: string }) => {
    const id = crypto.randomUUID();
    const user: User = {
      id,
      name: input.name,
      email: input.email,
      isActive: true,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    mockUsers.set(id, user);
    return user;
  },
  update: async (id: string, input: { name?: string; email?: string }) => {
    const user = mockUsers.get(id);
    if (!user) return null;
    if (input.name !== undefined) user.name = input.name;
    if (input.email !== undefined) user.email = input.email;
    user.modifiedAt = new Date();
    mockUsers.set(id, user);
    return user;
  },
  delete: async (id: string) => mockUsers.delete(id),
  count: async (criteria?: Record<string, unknown>) => {
    if (!criteria || Object.keys(criteria).length === 0) return mockUsers.size;
    return Array.from(mockUsers.values()).filter((user) => {
      const rec = user as unknown as Record<string, unknown>;
      return Object.entries(criteria).every(([key, value]) => rec[key] === value);
    }).length;
  },
  exists: async (criteria: Record<string, unknown>) => {
    for (const user of mockUsers.values()) {
      const rec = user as unknown as Record<string, unknown>;
      const match = Object.entries(criteria).every(([key, value]) => rec[key] === value);
      if (match) return true;
    }
    return false;
  },
};

const createUserUseCase = new CreateUserUseCase(mockRepo);
const getAllUsersUseCase = new GetAllUsersUseCase(mockRepo);
const getUserByIdUseCase = new GetUserByIdUseCase(mockRepo);
const updateUserUseCase = new UpdateUserUseCase(mockRepo);
const deleteUserUseCase = new DeleteUserUseCase(mockRepo);
const controller = new UserController(
  createUserUseCase,
  getAllUsersUseCase,
  getUserByIdUseCase,
  updateUserUseCase,
  deleteUserUseCase,
);

const logger = createLogger('user-service-test');
const app = express();
app.use(express.json());
app.use(createUserRoutes(controller));
app.use(errorHandler({ logger }));

describe('User Service', () => {
  beforeEach(() => mockUsers.clear());

  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('POST /users creates user and GET /users/:id returns it', async () => {
    const createRes = await request(app)
      .post('/users')
      .send({ name: 'Test User', email: 'test@example.com' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.name).toBe('Test User');
    expect(createRes.body.data.email).toBe('test@example.com');
    expect(createRes.body.data.id).toBeDefined();

    const getRes = await request(app).get(`/users/${createRes.body.data.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.name).toBe('Test User');
    expect(getRes.body.data.email).toBe('test@example.com');
  });

  it('PUT /users/:id updates user', async () => {
    const createRes = await request(app)
      .post('/users')
      .send({ name: 'Old', email: 'old@example.com' });
    const id = createRes.body.data.id;
    const updateRes = await request(app).put(`/users/${id}`).send({ name: 'New Name' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.name).toBe('New Name');
    expect(updateRes.body.data.email).toBe('old@example.com');
  });

  it('DELETE /users/:id removes user', async () => {
    const createRes = await request(app)
      .post('/users')
      .send({ name: 'To Delete', email: 'del@example.com' });
    const id = createRes.body.data.id;
    const delRes = await request(app).delete(`/users/${id}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.message).toBe('User deleted successfully');
    const getRes = await request(app).get(`/users/${id}`);
    expect(getRes.status).toBe(404);
    expect(getRes.body.success).toBe(false);
  });

  it('GET /users returns all users with pagination', async () => {
    await request(app).post('/users').send({ name: 'A', email: 'a@x.com' });
    await request(app).post('/users').send({ name: 'B', email: 'b@x.com' });
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
    expect(res.body.data.items.map((u: { email: string }) => u.email)).toContain('a@x.com');
    expect(res.body.data.items.map((u: { email: string }) => u.email)).toContain('b@x.com');
  });

  it('POST /users without name returns 400', async () => {
    const res = await request(app).post('/users').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('POST /users with duplicate email returns 409', async () => {
    await request(app).post('/users').send({ name: 'A', email: 'dup@x.com' });
    const res = await request(app).post('/users').send({ name: 'B', email: 'dup@x.com' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
