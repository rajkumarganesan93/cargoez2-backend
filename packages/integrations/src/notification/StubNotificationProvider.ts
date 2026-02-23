import type { INotificationProvider, NotificationPayload } from './INotificationProvider.js';

export class StubNotificationProvider implements INotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    console.info('[StubNotificationProvider] Would send notification:', {
      title: payload.title,
      body: payload.body,
    });
  }
}
