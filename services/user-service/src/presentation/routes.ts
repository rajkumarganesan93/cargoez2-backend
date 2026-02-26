import { Router } from 'express';
import { asyncHandler } from '@rajkumarganesan93/shared';
import { validateBody, validateParams, IdParams, authorize } from '@rajkumarganesan93/infrastructure';
import { CreateUserBody, UpdateUserBody } from './models/user.models.js';
import type { UserController } from './controllers/UserController.js';

export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  router.get('/users', asyncHandler(controller.getAll));
  router.get('/users/:id', validateParams(IdParams), asyncHandler(controller.getById));
  router.post('/users', authorize('admin'), validateBody(CreateUserBody), asyncHandler(controller.create));
  router.put('/users/:id', authorize('admin', 'manager'), validateParams(IdParams), validateBody(UpdateUserBody), asyncHandler(controller.update));
  router.delete('/users/:id', authorize('admin'), validateParams(IdParams), asyncHandler(controller.delete));

  return router;
}
