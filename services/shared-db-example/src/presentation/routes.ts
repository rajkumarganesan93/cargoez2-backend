import { Router } from 'express';
import { asyncHandler } from '@rajkumarganesan93/shared';
import { success } from '@rajkumarganesan93/api';
import type { CountryController } from './controllers/CountryController.js';

export function createCountryRoutes(controller: CountryController): Router {
  const router = Router();

  /**
   * @openapi
   * /health:
   *   get:
   *     summary: Health check
   *     responses:
   *       200:
   *         description: Service is healthy
   */
  router.get('/health', (_req, res) => {
    res.json(success({ status: 'ok' }));
  });

  /**
   * @openapi
   * /countries:
   *   post:
   *     summary: Create a new country
   */
  router.post('/countries', asyncHandler(controller.create.bind(controller)));

  /**
   * @openapi
   * /countries:
   *   get:
   *     summary: Get all countries (paginated)
   */
  router.get('/countries', asyncHandler(controller.getAll.bind(controller)));

  /**
   * @openapi
   * /countries/{id}:
   *   get:
   *     summary: Get country by ID
   */
  router.get('/countries/:id', asyncHandler(controller.getById.bind(controller)));

  /**
   * @openapi
   * /countries/{id}:
   *   put:
   *     summary: Update a country
   */
  router.put('/countries/:id', asyncHandler(controller.update.bind(controller)));

  /**
   * @openapi
   * /countries/{id}:
   *   delete:
   *     summary: Delete a country
   */
  router.delete('/countries/:id', asyncHandler(controller.delete.bind(controller)));

  return router;
}
