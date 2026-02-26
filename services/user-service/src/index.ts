import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createServiceApp } from '@rajkumarganesan93/infrastructure';
import { swaggerSpec } from './presentation/swagger.js';
import { createUserRoutes } from './presentation/routes.js';
import { UserController } from './presentation/controllers/UserController.js';
import { UserRepository } from './infrastructure/repositories/UserRepository.js';
import { getKnex } from './infrastructure/db.js';
import { CreateUserUseCase } from './application/use-cases/CreateUserUseCase.js';
import { GetAllUsersUseCase } from './application/use-cases/GetAllUsersUseCase.js';
import { GetUserByIdUseCase } from './application/use-cases/GetUserByIdUseCase.js';
import { UpdateUserUseCase } from './application/use-cases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from './application/use-cases/DeleteUserUseCase.js';

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');

const { start } = createServiceApp({
  serviceName: 'user-service',
  port: 3001,
  envPath,
  swaggerSpec,
  routes: (app) => {
    const knex = getKnex();
    const repo = new UserRepository(knex);
    const controller = new UserController(
      new CreateUserUseCase(repo),
      new GetAllUsersUseCase(repo),
      new GetUserByIdUseCase(repo),
      new UpdateUserUseCase(repo),
      new DeleteUserUseCase(repo),
    );
    app.use(createUserRoutes(controller));
  },
  onShutdown: () => getKnex().destroy(),
});

start();
