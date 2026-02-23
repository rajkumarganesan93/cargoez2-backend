import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { createLogger } from '@rajkumarganesan93/application';
import { errorHandler, requestLogger, NotFoundError } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';
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

const logger = createLogger('shared-db-example');
const PORT = process.env.PORT ?? 3005;

const countryRepository = new CountryRepository(getKnex());
const createCountryUseCase = new CreateCountryUseCase(countryRepository);
const getAllCountriesUseCase = new GetAllCountriesUseCase(countryRepository);
const getCountryByIdUseCase = new GetCountryByIdUseCase(countryRepository);
const updateCountryUseCase = new UpdateCountryUseCase(countryRepository);
const deleteCountryUseCase = new DeleteCountryUseCase(countryRepository);
const countryController = new CountryController(
  createCountryUseCase,
  getAllCountriesUseCase,
  getCountryByIdUseCase,
  updateCountryUseCase,
  deleteCountryUseCase,
);

const app = express();
app.use(express.json());
app.use(requestLogger(logger));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(createCountryRoutes(countryController));

app.use((_req, _res, next) => next(new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Route' })));
app.use(errorHandler({ logger }));

app.listen(PORT, () => {
  logger.info({ port: PORT }, `Shared DB Example service listening on port ${PORT}`);
});
