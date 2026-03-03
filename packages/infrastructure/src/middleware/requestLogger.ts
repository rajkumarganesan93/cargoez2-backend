import type { Request, Response, NextFunction } from 'express';
import type pino from 'pino';
import { getContextOrNull } from '../context/RequestContext.js';

export function requestLogger(logger: pino.Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    let logged = false;

    const logRequest = (aborted = false) => {
      if (logged) return;
      logged = true;
      const duration = Date.now() - start;
      const ctx = getContextOrNull();
      const meta = {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
        ...(ctx && { requestId: ctx.requestId, userId: ctx.userId }),
        ...(aborted && { aborted: true }),
      };
      logger.info(meta, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    };

    res.on('finish', () => logRequest(false));
    res.on('close', () => logRequest(!res.writableFinished));

    next();
  };
}
