import 'dotenv/config';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './presentation/swagger.js';
import { createReferenceRoutes } from './presentation/routes.js';
import { ReferenceController } from './presentation/controllers/ReferenceController.js';
import { CountryRepository } from './infrastructure/repositories/CountryRepository.js';
import { GetCountriesUseCase } from './application/use-cases/GetCountriesUseCase.js';
import { GetCountryByCodeUseCase } from './application/use-cases/GetCountryByCodeUseCase.js';

const PORT = process.env.PORT ?? 3004;

const countryRepository = new CountryRepository();
const getCountriesUseCase = new GetCountriesUseCase(countryRepository);
const getCountryByCodeUseCase = new GetCountryByCodeUseCase(countryRepository);
const referenceController = new ReferenceController(getCountriesUseCase, getCountryByCodeUseCase);

const app = express();
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(createReferenceRoutes(referenceController));

app.listen(PORT, () => {
  console.log(`Shared service listening on port ${PORT}`);
});
