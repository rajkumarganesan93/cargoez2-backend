export { z } from 'zod';

export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from './errors/AppError.js';
export { errorHandler } from './middleware/errorHandler.js';
export { requestLogger } from './middleware/requestLogger.js';
export type { ErrorHandlerOptions } from './middleware/errorHandler.js';
export { BaseRepository } from './repositories/BaseRepository.js';

export { validateBody, validateParams, validateQuery } from './middleware/validate.js';
export type { ValidatedRequest } from './middleware/validate.js';

export { sendSuccess, sendError, sendPaginated } from './helpers/response.js';

export { createAuthMiddleware } from './middleware/authenticate.js';
export type { AuthUser, AuthenticatedRequest, AuthConfig } from './middleware/authenticate.js';
export { authorize } from './middleware/authorize.js';

export { createServiceApp } from './app/createServiceApp.js';
export type { ServiceAppConfig, ServiceAppResult } from './app/createServiceApp.js';

export { IdParams, BaseEntitySchema } from './schemas/common.js';

export {
  zodToSwagger,
  SwaggerTypedSuccessResponse,
  SwaggerTypedPaginatedResponse,
  SwaggerRequestBody,
  SwaggerSuccessResponse,
  SwaggerErrorResponse,
  SwaggerPaginationMeta,
  SwaggerPaginatedResponse,
  SwaggerPaginationParams,
  SwaggerBearerAuth,
  SwaggerSecurityRequirement,
  SwaggerAuthResponses,
} from './swagger/index.js';
