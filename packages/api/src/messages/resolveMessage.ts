import { MessageCode } from './MessageCode.js';
import { MessageCatalog } from './MessageCatalog.js';
import type { MessageEntry } from './MessageCatalog.js';

export interface ResolvedMessage {
  messageCode: MessageCode;
  status: number;
  message: string;
}

/**
 * Resolve a MessageCode into its HTTP status and interpolated message string.
 *
 * @param code    - A value from the `MessageCode` enum.
 * @param params  - Key/value pairs that replace `{key}` tokens in the template.
 *
 * @example
 *   resolveMessage(MessageCode.CREATED, { resource: 'User' });
 *   // → { messageCode: 'CREATED', status: 201, message: 'User created successfully' }
 *
 *   resolveMessage(MessageCode.DUPLICATE_EMAIL, { email: 'a@b.com' });
 *   // → { messageCode: 'DUPLICATE_EMAIL', status: 409, message: 'Email a@b.com is already in use' }
 */
export function resolveMessage(
  code: MessageCode,
  params?: Record<string, string | number>,
): ResolvedMessage {
  const entry: MessageEntry | undefined = MessageCatalog[code];
  if (!entry) {
    return {
      messageCode: code,
      status: 500,
      message: `Unknown message code: ${code}`,
    };
  }

  let message = entry.message;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
  }

  return { messageCode: code, status: entry.status, message };
}
