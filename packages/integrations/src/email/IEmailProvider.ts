export interface EmailMessage {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

export interface IEmailProvider {
  send(message: EmailMessage): Promise<void>;
}
