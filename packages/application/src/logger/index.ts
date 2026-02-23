import pino from 'pino';

const opts: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  base: {
    env: process.env.NODE_ENV ?? 'development',
  },
};

const rootLogger = (pino as unknown as (opts: pino.LoggerOptions) => pino.Logger)(opts);

/**
 * Create a child logger with service/context binding.
 */
export function createLogger(
  serviceName: string,
  bindings?: Record<string, unknown>
): pino.Logger {
  return rootLogger.child({
    service: serviceName,
    ...bindings,
  });
}

export default rootLogger;
