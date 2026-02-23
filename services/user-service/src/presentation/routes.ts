import { Router } from 'express';
import { asyncHandler } from '@rajkumarganesan93/shared';
import { success } from '@rajkumarganesan93/api';
import type { UserController } from './controllers/UserController.js';

export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json(success({ status: 'ok' }));
  });

  router.post('/users', asyncHandler(controller.create.bind(controller)));
  router.get('/users', asyncHandler(controller.getAll.bind(controller)));
  router.get('/users/:id', asyncHandler(controller.getById.bind(controller)));
  router.put('/users/:id', asyncHandler(controller.update.bind(controller)));
  router.delete('/users/:id', asyncHandler(controller.delete.bind(controller)));

  return router;
}
