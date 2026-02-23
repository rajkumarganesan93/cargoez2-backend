import type { Request, Response, NextFunction } from 'express';
import type pino from 'pino';
import { AppError } from '../errors/AppError.js';
import { error as errorResponse } from '@cargoez2/api';

type Logger = pino.Logger;

export interface ErrorHandlerOptions {
  logger: Logger;
  includeStack?: boolean;
}

export function errorHandler(
  options: ErrorHandlerOptions
): (err: Error, req: Request, res: Response, _next: NextFunction) => void {
  const { logger, includeStack = process.env.NODE_ENV !== 'production' } = options;

  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err.message || 'Internal server error';

    const logContext = {
      err,
      method: req.method,
      path: req.path,
      statusCode,
    };

    if (statusCode >= 500) {
      logger.error(logContext, message);
    } else {
      logger.warn(logContext, message);
    }

    const body = errorResponse(
      message,
      statusCode,
      includeStack && err.stack ? err.stack : undefined
    );

    if (!res.headersSent) {
      res.status(statusCode).json(body);
    }
  };
}
