import type { Request, Response, NextFunction } from 'express';

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export function asyncHandler(
  fn: AsyncRequestHandler
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next) as Promise<void>;
  };
}

export function healthCheck(): { status: string; timestamp: string } {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
