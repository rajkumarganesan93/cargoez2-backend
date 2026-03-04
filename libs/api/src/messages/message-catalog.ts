import { MessageCode } from './message-code.enum';

export interface MessageEntry {
  httpStatus: number;
  message: string;
}

export const MessageCatalog = new Map<MessageCode, MessageEntry>([
  [MessageCode.SUCCESS, { httpStatus: 200, message: 'Operation completed successfully' }],
  [MessageCode.CREATED, { httpStatus: 201, message: 'Resource created successfully' }],
  [MessageCode.UPDATED, { httpStatus: 200, message: 'Resource updated successfully' }],
  [MessageCode.DELETED, { httpStatus: 200, message: 'Resource deleted successfully' }],
  [MessageCode.FETCHED, { httpStatus: 200, message: 'Resource fetched successfully' }],
  [MessageCode.LIST_FETCHED, { httpStatus: 200, message: 'Resources fetched successfully' }],
  [MessageCode.NOT_FOUND, { httpStatus: 404, message: 'Resource not found' }],
  [MessageCode.ALREADY_EXISTS, { httpStatus: 409, message: 'Resource already exists' }],
  [MessageCode.VALIDATION_FAILED, { httpStatus: 422, message: 'Validation failed' }],
  [MessageCode.FIELD_REQUIRED, { httpStatus: 422, message: 'Required field is missing' }],
  [MessageCode.INVALID_INPUT, { httpStatus: 422, message: 'Invalid input provided' }],
  [MessageCode.UNAUTHORIZED, { httpStatus: 401, message: 'Unauthorized access' }],
  [MessageCode.FORBIDDEN, { httpStatus: 403, message: 'Access forbidden' }],
  [MessageCode.INTERNAL_ERROR, { httpStatus: 500, message: 'Internal server error' }],
]);
