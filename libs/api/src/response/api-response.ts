import { MessageCode } from '../messages/message-code.enum';
import { MessageCatalog } from '../messages/message-catalog';

export interface ApiResponse<T = any> {
  success: boolean;
  messageCode: MessageCode;
  message: string;
  data?: T;
  errors?: any[];
}

export function createSuccessResponse<T>(messageCode: MessageCode, data?: T): ApiResponse<T> {
  const entry = MessageCatalog.get(messageCode)!;
  return { success: true, messageCode, message: entry.message, data };
}

export function createErrorResponse(messageCode: MessageCode, errors?: any[]): ApiResponse {
  const entry = MessageCatalog.get(messageCode)!;
  return { success: false, messageCode, message: entry.message, errors };
}
