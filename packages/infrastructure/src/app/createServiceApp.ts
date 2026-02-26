import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import express, { type Express, type Router } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createLogger } from '@rajkumarganesan93/application';
import { success, MessageCode } from '@rajkumarganesan93/api';
import { errorHandler } from '../middleware/errorHandler.js';
import { requestLogger } from '../middleware/requestLogger.js';
import { createAuthMiddleware, type AuthConfig } from '../middleware/authenticate.js';
import { NotFoundError } from '../errors/AppError.js';
import type pino from 'pino';

export interface ServiceAppConfig {
  serviceName: string;
  /** Default port. Overridden by process.env.PORT if set (loaded after dotenv). */
  port: number | string;
  swaggerSpec?: object;
  routes: (app: Express) => void;
  onShutdown?: () => Promise<void>;
  /** Absolute path to .env file. When provided, dotenv loads before anything else. */
  envPath?: string;
  /**
   * Keycloak / OIDC authentication config.
   *
   * - **Auto-detect (recommended):** Omit this field and set `KEYCLOAK_ISSUER`
   *   (and optionally `KEYCLOAK_AUDIENCE`) in your `.env` file. Auth is enabled
   *   automatically after dotenv loads.
   * - **Explicit:** Pass `{ issuer, audience }` directly.
   * - **Disabled:** Set to `false` or omit the env vars entirely.
   */
  auth?: AuthConfig | false;
}

export interface ServiceAppResult {
  app: Express;
  logger: pino.Logger;
  start: () => void;
}

/**
 * Creates a fully configured Express app with all standard middleware.
 * Handles: JSON parsing, request logging, Swagger UI, health check,
 * 404 catch-all, error handler, and graceful shutdown.
 *
 * Usage:
 *   const { start } = createServiceApp({
 *     serviceName: 'user-service',
 *     port: process.env.PORT ?? 3001,
 *     swaggerSpec,
 *     routes: (app) => app.use(createUserRoutes(controller)),
 *     onShutdown: () => knex.destroy(),
 *   });
 *   start();
 */
export function createServiceApp(config: ServiceAppConfig): ServiceAppResult {
  const { serviceName, port: defaultPort, swaggerSpec, routes, onShutdown, envPath, auth } = config;

  if (envPath) {
    dotenv.config({ path: envPath });
  }

  const port = process.env.PORT ?? defaultPort;
  const logger = createLogger(serviceName);

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger(logger));

  if (swaggerSpec) {
    app.get('/api-docs/json', (_req, res) => {
      res.json(swaggerSpec);
    });
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.get('/health', (_req, res) => {
    res.json(success({ status: 'ok' }));
  });

  const resolvedAuth: AuthConfig | undefined =
    auth === false
      ? undefined
      : auth ?? (process.env.KEYCLOAK_ISSUER
          ? { issuer: process.env.KEYCLOAK_ISSUER, audience: process.env.KEYCLOAK_AUDIENCE }
          : undefined);

  if (resolvedAuth) {
    logger.info('JWT authentication enabled (issuer: %s)', resolvedAuth.issuer);
    app.use(createAuthMiddleware(resolvedAuth));
  }

  routes(app);

  app.use((_req, _res, next) =>
    next(new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Route' })),
  );
  app.use(errorHandler({ logger }));

  function start(): void {
    const server = app.listen(port, () => {
      logger.info({ port }, `${serviceName} listening on port ${port}`);
    });

    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      server.close(async () => {
        if (onShutdown) {
          try {
            await onShutdown();
            logger.info('Cleanup completed');
          } catch (err) {
            logger.error({ err }, 'Error during shutdown cleanup');
          }
        }
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  return { app, logger, start };
}
