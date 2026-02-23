interface NotificationBase {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface NotificationToUser extends NotificationBase {
  userId: string;
  deviceToken?: string;
  topic?: string;
}

interface NotificationToDevice extends NotificationBase {
  userId?: string;
  deviceToken: string;
  topic?: string;
}

interface NotificationToTopic extends NotificationBase {
  userId?: string;
  deviceToken?: string;
  topic: string;
}

/** At least one destination (userId, deviceToken, or topic) is required. */
export type NotificationPayload =
  | NotificationToUser
  | NotificationToDevice
  | NotificationToTopic;

export interface INotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}
