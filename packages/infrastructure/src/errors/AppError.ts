import { MessageCode, resolveMessage } from '@rajkumarganesan93/api';

const MESSAGE_CODES = new Set(Object.values(MessageCode));

/**
 * Base application error with optional MessageCode support.
 *
 * Prefer the MessageCode overload so the error handler can produce
 * structured responses automatically:
 *
 *   throw new AppError(MessageCode.NOT_FOUND, { resource: 'User' });
 */
export class AppError extends Error {
  public statusCode: number;
  public readonly isOperational: boolean;
  public readonly messageCode?: MessageCode;
  public readonly messageParams?: Record<string, string | number>;

  constructor(
    codeOrMessage: MessageCode | string,
    paramsOrStatusCode?: Record<string, string | number> | number,
    isOperational: boolean = true,
  ) {
    if (MESSAGE_CODES.has(codeOrMessage as MessageCode)) {
      const code = codeOrMessage as MessageCode;
      const params = (typeof paramsOrStatusCode === 'object' ? paramsOrStatusCode : undefined);
      const resolved = resolveMessage(code, params);

      super(resolved.message);
      this.statusCode = resolved.status;
      this.messageCode = code;
      this.messageParams = params;
    } else {
      super(codeOrMessage as string);
      this.statusCode = typeof paramsOrStatusCode === 'number' ? paramsOrStatusCode : 500;
    }

    this.name = this.constructor.name;
    this.isOperational = isOperational;
  }
}

export class BadRequestError extends AppError {
  constructor(code: MessageCode, params?: Record<string, string | number>);
  constructor(message: string);
  constructor(codeOrMessage: MessageCode | string, params?: Record<string, string | number>) {
    if (MESSAGE_CODES.has(codeOrMessage as MessageCode)) {
      super(codeOrMessage as MessageCode, params);
    } else {
      super(codeOrMessage as string, 400);
    }
    this.statusCode = 400;
  }
}

export class UnauthorizedError extends AppError {
  constructor(code: MessageCode, params?: Record<string, string | number>);
  constructor(message: string);
  constructor(codeOrMessage: MessageCode | string, params?: Record<string, string | number>) {
    if (MESSAGE_CODES.has(codeOrMessage as MessageCode)) {
      super(codeOrMessage as MessageCode, params);
    } else {
      super(codeOrMessage as string, 401);
    }
    this.statusCode = 401;
  }
}

export class ForbiddenError extends AppError {
  constructor(code: MessageCode, params?: Record<string, string | number>);
  constructor(message: string);
  constructor(codeOrMessage: MessageCode | string, params?: Record<string, string | number>) {
    if (MESSAGE_CODES.has(codeOrMessage as MessageCode)) {
      super(codeOrMessage as MessageCode, params);
    } else {
      super(codeOrMessage as string, 403);
    }
    this.statusCode = 403;
  }
}

export class NotFoundError extends AppError {
  constructor(code: MessageCode, params?: Record<string, string | number>);
  constructor(message: string);
  constructor(codeOrMessage: MessageCode | string, params?: Record<string, string | number>) {
    if (MESSAGE_CODES.has(codeOrMessage as MessageCode)) {
      super(codeOrMessage as MessageCode, params);
    } else {
      super(codeOrMessage as string, 404);
    }
    this.statusCode = 404;
  }
}

export class ConflictError extends AppError {
  constructor(code: MessageCode, params?: Record<string, string | number>);
  constructor(message: string);
  constructor(codeOrMessage: MessageCode | string, params?: Record<string, string | number>) {
    if (MESSAGE_CODES.has(codeOrMessage as MessageCode)) {
      super(codeOrMessage as MessageCode, params);
    } else {
      super(codeOrMessage as string, 409);
    }
    this.statusCode = 409;
  }
}
