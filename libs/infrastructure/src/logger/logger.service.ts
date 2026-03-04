import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';
import { getContextOrNull } from '../context/request-context';

@Injectable()
export class PinoLoggerService implements NestLoggerService {
  private logger = pino({
    transport:
      process.env['NODE_ENV'] !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });

  log(message: string, ...optionalParams: any[]) {
    this.logger.info(this.enrich(), message, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]) {
    this.logger.error(this.enrich(), message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]) {
    this.logger.warn(this.enrich(), message, ...optionalParams);
  }

  debug(message: string, ...optionalParams: any[]) {
    this.logger.debug(this.enrich(), message, ...optionalParams);
  }

  verbose(message: string, ...optionalParams: any[]) {
    this.logger.trace(this.enrich(), message, ...optionalParams);
  }

  private enrich(): Record<string, any> {
    const ctx = getContextOrNull();
    if (!ctx) return {};
    return { requestId: ctx.requestId, userId: ctx.userId };
  }
}
