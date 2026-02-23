import type { Request, Response, NextFunction } from 'express';
import type pino from 'pino';
import { AppError } from '../errors/AppError.js';
import { error as errorResponse, errorRaw, MessageCode } from '@rajkumarganesan93/api';

type Logger = pino.Logger;

export interface ErrorHandlerOptions {
  logger: Logger;
  includeStack?: boolean;
}

export function errorHandler(
  options: ErrorHandlerOptions,
): (err: Error, req: Request, res: Response, _next: NextFunction) => void {
  const { logger, includeStack = process.env.NODE_ENV !== 'production' } = options;

  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const message = err.message || 'Internal server error';
    const stack = includeStack && err.stack ? err.stack : undefined;

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

    let body;
    if (isAppError && err.messageCode) {
      body = errorResponse(err.messageCode, err.messageParams, stack);
    } else if (isAppError) {
      body = errorRaw(message, statusCode, stack);
    } else {
      body = errorResponse(MessageCode.INTERNAL_ERROR, undefined, stack);
    }

    if (!res.headersSent) {
      res.status(statusCode).json(body);
    }
  };
}
