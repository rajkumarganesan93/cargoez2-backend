import { HttpException } from '@nestjs/common';
import { MessageCode } from '../messages/message-code.enum';
import { MessageCatalog } from '../messages/message-catalog';

export class AppException extends HttpException {
  public readonly messageCode: MessageCode;

  constructor(messageCode: MessageCode, details?: any) {
    const entry = MessageCatalog.get(messageCode);
    const status = entry?.httpStatus ?? 500;
    const message = entry?.message ?? 'Internal Server Error';
    super(
      { success: false, messageCode, message, errors: details ? [details] : undefined },
      status,
    );
    this.messageCode = messageCode;
  }
}

export class NotFoundException extends AppException {
  constructor(entity: string) {
    super(MessageCode.NOT_FOUND, `${entity} not found`);
  }
}

export class ValidationException extends AppException {
  constructor(errors: any[]) {
    super(MessageCode.VALIDATION_FAILED, errors);
  }
}

export class AlreadyExistsException extends AppException {
  constructor(entity: string) {
    super(MessageCode.ALREADY_EXISTS, `${entity} already exists`);
  }
}
