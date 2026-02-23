import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { createLogger } from '@rajkumarganesan93/application';
import { errorHandler, requestLogger, NotFoundError } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';
import { swaggerSpec } from './presentation/swagger.js';
import { createUserRoutes } from './presentation/routes.js';
import { UserController } from './presentation/controllers/UserController.js';
import { UserRepository } from './infrastructure/repositories/UserRepository.js';
import { CreateUserUseCase } from './application/use-cases/CreateUserUseCase.js';
import { GetAllUsersUseCase } from './application/use-cases/GetAllUsersUseCase.js';
import { GetUserByIdUseCase } from './application/use-cases/GetUserByIdUseCase.js';
import { UpdateUserUseCase } from './application/use-cases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from './application/use-cases/DeleteUserUseCase.js';

const logger = createLogger('user-service');
const PORT = process.env.PORT ?? 3001;

const userRepository = new UserRepository();
const createUserUseCase = new CreateUserUseCase(userRepository);
const getAllUsersUseCase = new GetAllUsersUseCase(userRepository);
const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
const updateUserUseCase = new UpdateUserUseCase(userRepository);
const deleteUserUseCase = new DeleteUserUseCase(userRepository);
const userController = new UserController(
  createUserUseCase,
  getAllUsersUseCase,
  getUserByIdUseCase,
  updateUserUseCase,
  deleteUserUseCase
);

const app = express();
app.use(express.json());
app.use(requestLogger(logger));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(createUserRoutes(userController));

app.use((_req, _res, next) => next(new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Route' })));
app.use(errorHandler({ logger }));

app.listen(PORT, () => {
  logger.info({ port: PORT }, `User service listening on port ${PORT}`);
});
