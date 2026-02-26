import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../errors/AppError.js';
import { MessageCode } from '@rajkumarganesan93/api';

/**
 * Extended Express Request with validated and typed body/params/query.
 *
 * Usage in controllers:
 *   create = async (req: ValidatedRequest<CreateUserBody>, res: Response) => {
 *     const { name, email } = req.validated.body;
 *   };
 *
 *   getById = async (req: ValidatedRequest<unknown, IdParams>, res: Response) => {
 *     const { id } = req.validated.params;
 *   };
 */
export interface ValidatedRequest<
  TBody = unknown,
  TParams = unknown,
  TQuery = unknown,
> extends Request {
  validated: {
    body: TBody;
    params: TParams;
    query: TQuery;
  };
}

function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    })
    .join('; ');
}

/**
 * Express middleware that validates `req.body` against a zod schema.
 * On success, the parsed (and transformed) result is attached to `req.validated.body`.
 * On failure, throws a ValidationError (422) with VALIDATION_FAILED and combined error messages.
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(
        MessageCode.VALIDATION_FAILED,
        { reason: formatZodErrors(result.error) },
      );
    }
    const vreq = req as unknown as ValidatedRequest;
    if (!vreq.validated) vreq.validated = { body: undefined, params: undefined, query: undefined };
    vreq.validated.body = result.data;
    next();
  };
}

/**
 * Express middleware that validates `req.params` against a zod schema.
 * On success, the parsed result is attached to `req.validated.params`.
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw new ValidationError(
        MessageCode.INVALID_INPUT,
        { reason: formatZodErrors(result.error) },
      );
    }
    const vreq = req as unknown as ValidatedRequest;
    if (!vreq.validated) vreq.validated = { body: undefined, params: undefined, query: undefined };
    vreq.validated.params = result.data;
    next();
  };
}

/**
 * Express middleware that validates `req.query` against a zod schema.
 * On success, the parsed result is attached to `req.validated.query`.
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw new ValidationError(
        MessageCode.INVALID_INPUT,
        { reason: formatZodErrors(result.error) },
      );
    }
    const vreq = req as unknown as ValidatedRequest;
    if (!vreq.validated) vreq.validated = { body: undefined, params: undefined, query: undefined };
    vreq.validated.query = result.data;
    next();
  };
}
