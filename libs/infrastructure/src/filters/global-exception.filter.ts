import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { MessageCode } from '@cargoez/api';
import { getContextOrNull } from '../context/request-context';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const requestContext = getContextOrNull();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let messageCode = MessageCode.INTERNAL_ERROR;
    let message = 'Internal Server Error';
    let errors: any[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        messageCode = (body as any).messageCode || this.statusToMessageCode(status);
        message = (body as any).message || exception.message;
        errors = (body as any).errors;
      } else {
        message = String(body);
        messageCode = this.statusToMessageCode(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `[${requestContext?.requestId}] ${status} ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      success: false,
      messageCode,
      message,
      errors,
    });
  }

  private statusToMessageCode(status: number): MessageCode {
    switch (status) {
      case 401:
        return MessageCode.UNAUTHORIZED;
      case 403:
        return MessageCode.FORBIDDEN;
      case 404:
        return MessageCode.NOT_FOUND;
      case 422:
        return MessageCode.VALIDATION_FAILED;
      default:
        return MessageCode.INTERNAL_ERROR;
    }
  }
}
