import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import { createServiceApp } from '@rajkumarganesan93/infrastructure';
import { swaggerSpec } from './presentation/swagger.js';
import { createCountryRoutes } from './presentation/routes.js';
import { CountryController } from './presentation/controllers/CountryController.js';
import { CountryRepository } from './infrastructure/repositories/CountryRepository.js';
import { getKnex } from './infrastructure/db.js';
import { CreateCountryUseCase } from './application/use-cases/CreateCountryUseCase.js';
import { GetAllCountriesUseCase } from './application/use-cases/GetAllCountriesUseCase.js';
import { GetCountryByIdUseCase } from './application/use-cases/GetCountryByIdUseCase.js';
import { UpdateCountryUseCase } from './application/use-cases/UpdateCountryUseCase.js';
import { DeleteCountryUseCase } from './application/use-cases/DeleteCountryUseCase.js';

const knex = getKnex();
const repo = new CountryRepository(knex);
const controller = new CountryController(
  new CreateCountryUseCase(repo),
  new GetAllCountriesUseCase(repo),
  new GetCountryByIdUseCase(repo),
  new UpdateCountryUseCase(repo),
  new DeleteCountryUseCase(repo),
);

const { start } = createServiceApp({
  serviceName: 'shared-db-example',
  port: process.env.PORT ?? 3005,
  swaggerSpec,
  routes: (app) => app.use(createCountryRoutes(controller)),
  onShutdown: () => knex.destroy(),
});

start();
