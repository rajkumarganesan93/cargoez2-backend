import { Router } from 'express';
import { asyncHandler } from '@rajkumarganesan93/shared';
import { success } from '@rajkumarganesan93/api';
import type { UserController } from './controllers/UserController.js';

export function createUserRoutes(controller: UserController): Router {
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
   * /users:
   *   post:
   *     summary: Create a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *     responses:
   *       201:
   *         description: User created successfully
   *       400:
   *         description: Bad request - name and email required
   *       409:
   *         description: User with email already exists
   *       500:
   *         description: Internal server error
   */
  router.post('/users', asyncHandler(controller.create.bind(controller)));

  /**
   * @openapi
   * /users:
   *   get:
   *     summary: Get all users
   *     responses:
   *       200:
   *         description: List of users
   *       500:
   *         description: Internal server error
   */
  router.get('/users', asyncHandler(controller.getAll.bind(controller)));

  /**
   * @openapi
   * /users/{id}:
   *   get:
   *     summary: Get user by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: User found
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  router.get('/users/:id', asyncHandler(controller.getById.bind(controller)));

  /**
   * @openapi
   * /users/{id}:
   *   put:
   *     summary: Update a user
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *     responses:
   *       200:
   *         description: User updated successfully
   *       400:
   *         description: Bad request - at least name or email required
   *       404:
   *         description: User not found
   *       409:
   *         description: Email already in use
   *       500:
   *         description: Internal server error
   */
  router.put('/users/:id', asyncHandler(controller.update.bind(controller)));

  /**
   * @openapi
   * /users/{id}:
   *   delete:
   *     summary: Delete a user
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       204:
   *         description: User deleted successfully
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  router.delete('/users/:id', asyncHandler(controller.delete.bind(controller)));

  return router;
}
