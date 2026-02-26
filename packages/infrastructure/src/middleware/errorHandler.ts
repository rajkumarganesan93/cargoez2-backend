import type { Request, Response, NextFunction } from 'express';
import type pino from 'pino';
import { AppError } from '../errors/AppError.js';
import { error as errorResponse, errorRaw, MessageCode } from '@rajkumarganesan93/api';

type Logger = pino.Logger;

export interface ErrorHandlerOptions {
  logger: Logger;
  includeStack?: boolean;
}

/**
 * Detect JSON parse errors thrown by Express body-parser.
 * These are SyntaxError instances with a `type` property of 'entity.parse.failed'.
 */
function isJsonParseError(err: Error): boolean {
  return (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as Record<string, unknown>).status === 400 &&
    'type' in err &&
    (err as Record<string, unknown>).type === 'entity.parse.failed'
  );
}

/**
 * Detect PayloadTooLargeError from Express body-parser.
 */
function isPayloadTooLargeError(err: Error): boolean {
  return (
    'type' in err &&
    (err as Record<string, unknown>).type === 'entity.too.large'
  );
}

/**
 * Detect PostgreSQL unique constraint violation (error code 23505).
 * These are thrown by pg when an INSERT or UPDATE violates a UNIQUE index.
 */
function isPgUniqueViolation(err: Error): boolean {
  return 'code' in err && (err as Record<string, unknown>).code === '23505';
}

export function errorHandler(
  options: ErrorHandlerOptions,
): (err: Error, req: Request, res: Response, _next: NextFunction) => void {
  const { logger, includeStack = process.env.NODE_ENV !== 'production' } = options;

  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    const stack = includeStack && err.stack ? err.stack : undefined;

    const logContext = {
      err,
      method: req.method,
      path: req.path,
    };

    if (isJsonParseError(err)) {
      logger.warn({ ...logContext, statusCode: 400 }, 'Malformed JSON in request body');
      if (!res.headersSent) {
        res.status(400).json(errorResponse(MessageCode.BAD_REQUEST, { reason: 'Malformed JSON' }, stack));
      }
      return;
    }

    if (isPayloadTooLargeError(err)) {
      logger.warn({ ...logContext, statusCode: 413 }, 'Request payload too large');
      if (!res.headersSent) {
        res.status(413).json(errorRaw('Request payload too large', 413, stack));
      }
      return;
    }

    if (isPgUniqueViolation(err)) {
      const detail = (err as unknown as Record<string, unknown>).detail as string | undefined;
      logger.warn({ ...logContext, statusCode: 409, detail }, 'Unique constraint violation');
      if (!res.headersSent) {
        res.status(409).json(
          errorResponse(MessageCode.DUPLICATE_ENTRY, { resource: 'Record', field: detail ?? 'field' }, stack),
        );
      }
      return;
    }

    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const message = err.message || 'Internal server error';

    if (statusCode >= 500) {
      logger.error({ ...logContext, statusCode }, message);
    } else {
      logger.warn({ ...logContext, statusCode }, message);
    }

    let body;
    if (isAppError && err.messageCode) {
      body = errorResponse(err.messageCode, err.messageParams, stack);
    } else if (isAppError && statusCode < 500) {
      body = errorRaw(message, statusCode, stack);
    } else {
      body = errorResponse(MessageCode.INTERNAL_ERROR, undefined, stack);
    }

    if (!res.headersSent) {
      res.status(statusCode).json(body);
    }
  };
}
