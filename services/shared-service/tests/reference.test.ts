import request from 'supertest';
import express from 'express';
import { createReferenceRoutes } from '../src/presentation/routes.js';
import { ReferenceController } from '../src/presentation/controllers/ReferenceController.js';
import { GetCountriesUseCase } from '../src/application/use-cases/GetCountriesUseCase.js';
import { GetCountryByCodeUseCase } from '../src/application/use-cases/GetCountryByCodeUseCase.js';

const mockCountries = [
  { id: '1', code: 'US', name: 'United States', createdAt: new Date() },
  { id: '2', code: 'IN', name: 'India', createdAt: new Date() },
];
const getCountriesUseCase = new GetCountriesUseCase({
  findById: async () => null,
  findAll: async () => mockCountries,
  findByCode: async (code) => mockCountries.find((c) => c.code === code) ?? null,
});
const getCountryByCodeUseCase = new GetCountryByCodeUseCase({
  findById: async () => null,
  findAll: async () => [],
  findByCode: async (code) => mockCountries.find((c) => c.code === code) ?? null,
});
const controller = new ReferenceController(getCountriesUseCase, getCountryByCodeUseCase);

const app = express();
app.use(express.json());
app.use(createReferenceRoutes(controller));

describe('Shared Service', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /countries returns list', async () => {
    const res = await request(app).get('/countries');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0].code).toBe('US');
  });

  it('GET /countries/US returns country', async () => {
    const res = await request(app).get('/countries/US');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('US');
    expect(res.body.name).toBe('United States');
  });

  it('GET /countries/XX returns 404', async () => {
    const res = await request(app).get('/countries/XX');
    expect(res.status).toBe(404);
  });
});
