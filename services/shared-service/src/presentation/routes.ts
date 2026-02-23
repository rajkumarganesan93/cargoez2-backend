import { Router } from 'express';
import { asyncHandler } from '@cargoez-be/shared';
import type { ReferenceController } from './controllers/ReferenceController.js';

export function createReferenceRoutes(controller: ReferenceController): Router {
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
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * @openapi
   * /countries:
   *   get:
   *     summary: Get all countries (reference data)
   *     responses:
   *       200:
   *         description: List of countries
   */
  router.get('/countries', asyncHandler(controller.getCountries.bind(controller)));

  /**
   * @openapi
   * /countries/{code}:
   *   get:
   *     summary: Get country by ISO code
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *           example: US
   *     responses:
   *       200:
   *         description: Country found
   *       404:
   *         description: Country not found
   */
  router.get('/countries/:code', asyncHandler(controller.getCountryByCode.bind(controller)));

  return router;
}
