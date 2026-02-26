import { Router } from 'express';
import { asyncHandler } from '@rajkumarganesan93/shared';
import { validateBody, validateParams, IdParams, authorize } from '@rajkumarganesan93/infrastructure';
import { CreateCountryBody, UpdateCountryBody } from './models/country.models.js';
import type { CountryController } from './controllers/CountryController.js';

export function createCountryRoutes(controller: CountryController): Router {
  const router = Router();

  router.get('/countries', asyncHandler(controller.getAll));
  router.get('/countries/:id', validateParams(IdParams), asyncHandler(controller.getById));
  router.post('/countries', authorize('admin'), validateBody(CreateCountryBody), asyncHandler(controller.create));
  router.put('/countries/:id', authorize('admin', 'manager'), validateParams(IdParams), validateBody(UpdateCountryBody), asyncHandler(controller.update));
  router.delete('/countries/:id', authorize('admin'), validateParams(IdParams), asyncHandler(controller.delete));

  return router;
}
