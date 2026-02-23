# @cargoez2/integrations

Interfaces and stub implementations for third-party integrations (email, notifications). Swap stubs for real providers (SendGrid, AWS SES, Firebase, etc.) in production.

## Installation

```bash
npm install @cargoez2/integrations
```

## What's included

| Export                      | Type      | Purpose                                   |
| ----------------------------- | --------- | ----------------------------------------- |
| `IEmailProvider`              | interface | Contract for sending emails               |
| `EmailMessage`                | interface | Shape of an email message                 |
| `StubEmailProvider`           | class     | Logs emails to console (dev/test)         |
| `INotificationProvider`       | interface | Contract for sending notifications        |
| `NotificationPayload`         | interface | Shape of a notification                   |
| `StubNotificationProvider`    | class     | Logs notifications to console (dev/test)  |

## Usage

### Email provider

```typescript
import type { IEmailProvider, EmailMessage } from '@cargoez2/integrations';
import { StubEmailProvider } from '@cargoez2/integrations';

// During development, use the stub:
const emailProvider: IEmailProvider = new StubEmailProvider();

const message: EmailMessage = {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: '<h1>Welcome to CargoEz</h1>',
};

await emailProvider.send(message);
// StubEmailProvider logs: "[StubEmail] Sending to user@example.com: Welcome!"
```

For production, implement the interface with a real provider:

```typescript
import type { IEmailProvider, EmailMessage } from '@cargoez2/integrations';
import sgMail from '@sendgrid/mail';

export class SendGridEmailProvider implements IEmailProvider {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    await sgMail.send({
      to: message.to,
      from: 'noreply@cargoez.com',
      subject: message.subject,
      html: message.body,
    });
  }
}
```

### Notification provider

```typescript
import type { INotificationProvider, NotificationPayload } from '@cargoez2/integrations';
import { StubNotificationProvider } from '@cargoez2/integrations';

const notifier: INotificationProvider = new StubNotificationProvider();

await notifier.send({
  userId: 'user-123',
  title: 'Order shipped',
  body: 'Your order #456 has been shipped.',
  channel: 'push',
});
```

### Dependency injection pattern

Register providers in your service's composition root:

```typescript
import { StubEmailProvider } from '@cargoez2/integrations';
import { SendGridEmailProvider } from './providers/SendGridEmailProvider.js';

const emailProvider = process.env.NODE_ENV === 'production'
  ? new SendGridEmailProvider(process.env.SENDGRID_API_KEY!)
  : new StubEmailProvider();

// Pass to use cases that need email
const useCase = new WelcomeEmailUseCase(emailProvider);
```

## Dependencies

- `@cargoez2/shared` -- shared config utilities
