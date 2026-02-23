import request from 'supertest';
import express from 'express';
import { createLogger } from '@rajkumarganesan93/application';
import { errorHandler } from '@rajkumarganesan93/infrastructure';
import { createAuthRoutes } from '../src/presentation/routes.js';
import { AuthController } from '../src/presentation/controllers/AuthController.js';
import { RegisterUseCase } from '../src/application/use-cases/RegisterUseCase.js';
import { LoginUseCase } from '../src/application/use-cases/LoginUseCase.js';
import { ValidateTokenUseCase } from '../src/application/use-cases/ValidateTokenUseCase.js';
import type { User } from '../src/domain/entities/User.js';
import type { Token } from '../src/domain/entities/Token.js';

const mockUsers: Map<string, User> = new Map();
const mockTokens: Map<string, { userId: string; value: string; expiresAt: Date }> = new Map();
const mockRoles = [
  {
    id: 'role-1',
    name: 'user',
    isActive: true,
    createdAt: new Date(),
    modifiedAt: new Date(),
  },
];

const userRepo = {
  findById: async (id: string) => mockUsers.get(id) ?? null,
  findByEmail: async (email: string) =>
    Array.from(mockUsers.values()).find((u) => u.email === email) ?? null,
  save: async (input: { email: string; passwordHash: string; roleId: string }) => {
    const id = crypto.randomUUID();
    const user: User = {
      id,
      email: input.email,
      passwordHash: input.passwordHash,
      roleId: input.roleId,
      isActive: true,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    mockUsers.set(id, user);
    return user;
  },
};
const roleRepo = {
  findById: async () => null,
  findByName: async (name: string) => mockRoles.find((r) => r.name === name) ?? null,
} as any;
const tokenRepo = {
  findByValue: async (value: string) => {
    const t = mockTokens.get(value);
    if (!t) return null;
    const token: Token = {
      id: '',
      userId: t.userId,
      value: t.value,
      expiresAt: t.expiresAt,
      isActive: true,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    return token;
  },
  save: async (input: { userId: string; value: string; expiresAt: Date }) => {
    mockTokens.set(input.value, {
      userId: input.userId,
      value: input.value,
      expiresAt: input.expiresAt,
    });
    const token: Token = {
      id: '',
      userId: input.userId,
      value: input.value,
      expiresAt: input.expiresAt,
      isActive: true,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    return token;
  },
  deleteByValue: async () => {},
};

const registerUseCase = new RegisterUseCase(userRepo, roleRepo);
const loginUseCase = new LoginUseCase(userRepo, tokenRepo);
const validateTokenUseCase = new ValidateTokenUseCase(tokenRepo, userRepo);
const controller = new AuthController(registerUseCase, loginUseCase, validateTokenUseCase);

const logger = createLogger('auth-service-test');
const app = express();
app.use(express.json());
app.use(createAuthRoutes(controller));
app.use(errorHandler({ logger }));

describe('Auth Service', () => {
  beforeEach(() => {
    mockUsers.clear();
    mockTokens.clear();
  });

  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('POST /auth/register creates user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'auth@example.com', password: 'secret' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('auth@example.com');
    expect(res.body.data.id).toBeDefined();
  });

  it('POST /auth/login returns token after register', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'login@example.com', password: 'mypass' });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'mypass' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.userId).toBeDefined();
    expect(res.body.data.email).toBe('login@example.com');
    expect(res.body.data.expiresAt).toBeDefined();
  });

  it('POST /auth/login with wrong password returns 401', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'x@y.com', password: 'right' });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'x@y.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/register without password returns 400', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /auth/validate without token returns 400', async () => {
    const res = await request(app).get('/auth/validate');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
