import type { IEmailProvider, EmailMessage } from './IEmailProvider.js';

export class StubEmailProvider implements IEmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.info('[StubEmailProvider] Would send email:', {
      to: message.to,
      subject: message.subject,
    });
  }
}
