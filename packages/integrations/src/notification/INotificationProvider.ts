export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  userId?: string;
  deviceToken?: string;
  topic?: string;
}

export interface INotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}
