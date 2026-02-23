import { Router } from 'express';
import { asyncHandler } from '@cargoez-be/shared';
import type { OrderController } from './controllers/OrderController.js';

export function createOrderRoutes(controller: OrderController): Router {
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
   * /orders:
   *   post:
   *     summary: Create a new order
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - totalAmount
   *             properties:
   *               userId:
   *                 type: string
   *               totalAmount:
   *                 type: number
   *               status:
   *                 type: string
   *     responses:
   *       201:
   *         description: Order created successfully
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal server error
   */
  router.post('/orders', asyncHandler(controller.create.bind(controller)));

  /**
   * @openapi
   * /orders/{id}:
   *   get:
   *     summary: Get order by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Order found
   *       404:
   *         description: Order not found
   */
  router.get('/orders/:id', asyncHandler(controller.getById.bind(controller)));

  return router;
}
