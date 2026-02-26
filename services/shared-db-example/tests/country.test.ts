import request from 'supertest';
import express from 'express';
import { createLogger } from '@rajkumarganesan93/application';
import { errorHandler } from '@rajkumarganesan93/infrastructure';
import { createCountryRoutes } from '../src/presentation/routes.js';
import { CountryController } from '../src/presentation/controllers/CountryController.js';
import { CreateCountryUseCase } from '../src/application/use-cases/CreateCountryUseCase.js';
import { GetAllCountriesUseCase } from '../src/application/use-cases/GetAllCountriesUseCase.js';
import { GetCountryByIdUseCase } from '../src/application/use-cases/GetCountryByIdUseCase.js';
import { UpdateCountryUseCase } from '../src/application/use-cases/UpdateCountryUseCase.js';
import { DeleteCountryUseCase } from '../src/application/use-cases/DeleteCountryUseCase.js';
import type { Country } from '../src/domain/entities/Country.js';
import type { ICountryRepository } from '../src/domain/repositories/ICountryRepository.js';

const mockCountries: Map<string, Country> = new Map();

const mockRepo: ICountryRepository = {
  findAll: async () => {
    const items = Array.from(mockCountries.values());
    return {
      items,
      meta: { total: items.length, page: 1, limit: 20, totalPages: 1 },
    };
  },
  findById: async (id: string) => mockCountries.get(id) ?? null,
  findOne: async (criteria: Record<string, unknown>) => {
    for (const country of mockCountries.values()) {
      const rec = country as unknown as Record<string, unknown>;
      const match = Object.entries(criteria).every(([key, value]) => rec[key] === value);
      if (match) return country;
    }
    return null;
  },
  findMany: async (criteria: Record<string, unknown>) => {
    const items = Array.from(mockCountries.values()).filter((country) => {
      const rec = country as unknown as Record<string, unknown>;
      return Object.entries(criteria).every(([key, value]) => rec[key] === value);
    });
    return {
      items,
      meta: { total: items.length, page: 1, limit: 20, totalPages: 1 },
    };
  },
  save: async (input: { code: string; name: string }) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const country: Country = {
      id,
      code: input.code,
      name: input.name,
      isActive: true,
      createdAt: now,
      modifiedAt: now,
    };
    mockCountries.set(id, country);
    return country;
  },
  update: async (id: string, input: { code?: string; name?: string }) => {
    const country = mockCountries.get(id);
    if (!country) return null;
    if (input.code !== undefined) country.code = input.code;
    if (input.name !== undefined) country.name = input.name;
    country.modifiedAt = new Date().toISOString();
    mockCountries.set(id, country);
    return country;
  },
  delete: async (id: string) => {
    const country = mockCountries.get(id);
    if (!country || !country.isActive) return false;
    country.isActive = false;
    return true;
  },
  count: async (criteria?: Record<string, unknown>) => {
    if (!criteria || Object.keys(criteria).length === 0) return mockCountries.size;
    return Array.from(mockCountries.values()).filter((country) => {
      const rec = country as unknown as Record<string, unknown>;
      return Object.entries(criteria).every(([key, value]) => rec[key] === value);
    }).length;
  },
  exists: async (criteria: Record<string, unknown>) => {
    for (const country of mockCountries.values()) {
      const rec = country as unknown as Record<string, unknown>;
      const match = Object.entries(criteria).every(([key, value]) => rec[key] === value);
      if (match) return true;
    }
    return false;
  },
  withTransaction: async <R>(fn: (trx: unknown) => Promise<R>): Promise<R> => fn(null),
};

const createCountryUseCase = new CreateCountryUseCase(mockRepo);
const getAllCountriesUseCase = new GetAllCountriesUseCase(mockRepo);
const getCountryByIdUseCase = new GetCountryByIdUseCase(mockRepo);
const updateCountryUseCase = new UpdateCountryUseCase(mockRepo);
const deleteCountryUseCase = new DeleteCountryUseCase(mockRepo);
const controller = new CountryController(
  createCountryUseCase,
  getAllCountriesUseCase,
  getCountryByIdUseCase,
  updateCountryUseCase,
  deleteCountryUseCase,
);

const logger = createLogger('shared-db-example-test');
const app = express();
app.use(express.json());
app.use(createCountryRoutes(controller));
app.use(errorHandler({ logger }));

describe('Shared DB Example - Country Service', () => {
  beforeEach(() => mockCountries.clear());

  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('POST /countries creates country with messageCode CREATED', async () => {
    const createRes = await request(app)
      .post('/countries')
      .send({ code: 'US', name: 'United States' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.messageCode).toBe('CREATED');
    expect(createRes.body.message).toBe('Country created successfully');
    expect(createRes.body.data.code).toBe('US');
    expect(createRes.body.data.id).toBeDefined();

    const getRes = await request(app).get(`/countries/${createRes.body.data.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.messageCode).toBe('FETCHED');
    expect(getRes.body.data.code).toBe('US');
  });

  it('PUT /countries/:id updates country with messageCode UPDATED', async () => {
    const createRes = await request(app)
      .post('/countries')
      .send({ code: 'GB', name: 'Great Britain' });
    const id = createRes.body.data.id;
    const updateRes = await request(app).put(`/countries/${id}`).send({ name: 'United Kingdom' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.messageCode).toBe('UPDATED');
    expect(updateRes.body.data.name).toBe('United Kingdom');
  });

  it('DELETE /countries/:id soft-deletes country with messageCode DELETED', async () => {
    const createRes = await request(app)
      .post('/countries')
      .send({ code: 'FR', name: 'France' });
    const id = createRes.body.data.id;
    const delRes = await request(app).delete(`/countries/${id}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.messageCode).toBe('DELETED');
    expect(delRes.body.message).toBe('Country deleted successfully');
    const getRes = await request(app).get(`/countries/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.isActive).toBe(false);
  });

  it('GET /countries returns all countries with pagination and messageCode', async () => {
    await request(app).post('/countries').send({ code: 'IN', name: 'India' });
    await request(app).post('/countries').send({ code: 'JP', name: 'Japan' });
    const res = await request(app).get('/countries');
    expect(res.status).toBe(200);
    expect(res.body.messageCode).toBe('LIST_FETCHED');
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
  });

  it('POST /countries without code returns 400 with FIELD_REQUIRED', async () => {
    const res = await request(app).post('/countries').send({ name: 'No Code' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.messageCode).toBe('FIELD_REQUIRED');
  });

  it('POST /countries with duplicate code returns 409 with DUPLICATE_ENTRY', async () => {
    await request(app).post('/countries').send({ code: 'DE', name: 'Germany' });
    const res = await request(app).post('/countries').send({ code: 'DE', name: 'Deutschland' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.messageCode).toBe('DUPLICATE_ENTRY');
  });
});
