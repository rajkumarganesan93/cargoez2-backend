import 'dotenv/config';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { createLogger } from '@rajkumarganesan93/application';
import { errorHandler, requestLogger, NotFoundError } from '@rajkumarganesan93/infrastructure';
import { swaggerSpec } from './presentation/swagger.js';
import { createAuthRoutes } from './presentation/routes.js';
import { AuthController } from './presentation/controllers/AuthController.js';
import { UserRepository } from './infrastructure/repositories/UserRepository.js';
import { RoleRepository } from './infrastructure/repositories/RoleRepository.js';
import { TokenRepository } from './infrastructure/repositories/TokenRepository.js';
import { RegisterUseCase } from './application/use-cases/RegisterUseCase.js';
import { LoginUseCase } from './application/use-cases/LoginUseCase.js';
import { ValidateTokenUseCase } from './application/use-cases/ValidateTokenUseCase.js';

const PORT = process.env.PORT ?? 3003;

const userRepository = new UserRepository();
const roleRepository = new RoleRepository();
const tokenRepository = new TokenRepository();
const registerUseCase = new RegisterUseCase(userRepository, roleRepository);
const loginUseCase = new LoginUseCase(userRepository, tokenRepository);
const validateTokenUseCase = new ValidateTokenUseCase(tokenRepository, userRepository);
const authController = new AuthController(
  registerUseCase,
  loginUseCase,
  validateTokenUseCase
);

const logger = createLogger('auth-service');
const app = express();
app.use(express.json());
app.use(requestLogger(logger));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(createAuthRoutes(authController));

app.use((_req, _res, next) => next(new NotFoundError('Not found')));
app.use(errorHandler({ logger }));

app.listen(PORT, () => {
  logger.info({ port: PORT }, `Auth service listening on port ${PORT}`);
});
