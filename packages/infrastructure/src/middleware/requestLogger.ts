import type { Request, Response, NextFunction } from 'express';
import type pino from 'pino';

export function requestLogger(logger: pino.Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(
        {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: duration,
        },
        `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
      );
    });
    next();
  };
}
