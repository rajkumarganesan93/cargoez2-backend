import { Router } from 'express';
import { asyncHandler } from '@rajkumarganesan93/shared';
import { validateBody, validateParams } from '@rajkumarganesan93/infrastructure';
import { CreateCountryBody, UpdateCountryBody, IdParams } from '../models/country.models.js';
import type { CountryController } from './controllers/CountryController.js';

export function createCountryRoutes(controller: CountryController): Router {
  const router = Router();

  router.post('/countries', validateBody(CreateCountryBody), asyncHandler(controller.create));
  router.get('/countries', asyncHandler(controller.getAll));
  router.get('/countries/:id', validateParams(IdParams), asyncHandler(controller.getById));
  router.put('/countries/:id', validateParams(IdParams), validateBody(UpdateCountryBody), asyncHandler(controller.update));
  router.delete('/countries/:id', validateParams(IdParams), asyncHandler(controller.delete));

  return router;
}
