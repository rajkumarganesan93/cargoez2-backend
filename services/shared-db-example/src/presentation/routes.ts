import { Router } from 'express';
import { asyncHandler } from '@rajkumarganesan93/shared';
import { success } from '@rajkumarganesan93/api';
import type { CountryController } from './controllers/CountryController.js';

export function createCountryRoutes(controller: CountryController): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json(success({ status: 'ok' }));
  });

  router.post('/countries', asyncHandler(controller.create.bind(controller)));
  router.get('/countries', asyncHandler(controller.getAll.bind(controller)));
  router.get('/countries/:id', asyncHandler(controller.getById.bind(controller)));
  router.put('/countries/:id', asyncHandler(controller.update.bind(controller)));
  router.delete('/countries/:id', asyncHandler(controller.delete.bind(controller)));

  return router;
}
