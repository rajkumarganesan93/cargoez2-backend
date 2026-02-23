import { MessageCode, resolveMessage } from '@rajkumarganesan93/api';

/**
 * Base application error with optional MessageCode support.
 *
 * Prefer the MessageCode overload so the error handler can produce
 * structured responses automatically:
 *
 *   throw new AppError(MessageCode.NOT_FOUND, { resource: 'User' });
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly messageCode?: MessageCode;
  public readonly messageParams?: Record<string, string | number>;

  constructor(
    codeOrMessage: MessageCode | string,
    paramsOrStatusCode?: Record<string, string | number> | number,
    isOperational: boolean = true,
  ) {
    if (Object.values(MessageCode).includes(codeOrMessage as MessageCode)) {
      const code = codeOrMessage as MessageCode;
      const params = (typeof paramsOrStatusCode === 'object' ? paramsOrStatusCode : undefined);
      const resolved = resolveMessage(code, params);

      super(resolved.message);
      this.name = 'AppError';
      this.statusCode = resolved.status;
      this.isOperational = isOperational;
      this.messageCode = code;
      this.messageParams = params;
    } else {
      super(codeOrMessage as string);
      this.name = 'AppError';
      this.statusCode = typeof paramsOrStatusCode === 'number' ? paramsOrStatusCode : 500;
      this.isOperational = isOperational;
    }

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(code: MessageCode, params?: Record<string, string | number>);
  constructor(message: string);
  constructor(codeOrMessage: MessageCode | string, params?: Record<string, string | number>) {
    if (Object.values(MessageCode).includes(codeOrMessage as MessageCode)) {
      super(codeOrMessage as MessageCode, params);
    } else {
      super(codeOrMessage as string, 400);
    }
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(code: MessageCode, params?: Record<string, string | number>);
  constructor(message: string);
  constructor(codeOrMessage: MessageCode | string, params?: Record<string, string | number>) {
    if (Object.values(MessageCode).includes(codeOrMessage as MessageCode)) {
      super(codeOrMessage as MessageCode, params);
    } else {
      super(codeOrMessage as string, 401);
    }
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends AppError {
  constructor(code: MessageCode, params?: Record<string, string | number>);
  constructor(message: string);
  constructor(codeOrMessage: MessageCode | string, params?: Record<string, string | number>) {
    if (Object.values(MessageCode).includes(codeOrMessage as MessageCode)) {
      super(codeOrMessage as MessageCode, params);
    } else {
      super(codeOrMessage as string, 404);
    }
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(code: MessageCode, params?: Record<string, string | number>);
  constructor(message: string);
  constructor(codeOrMessage: MessageCode | string, params?: Record<string, string | number>) {
    if (Object.values(MessageCode).includes(codeOrMessage as MessageCode)) {
      super(codeOrMessage as MessageCode, params);
    } else {
      super(codeOrMessage as string, 409);
    }
    this.name = 'ConflictError';
  }
}
