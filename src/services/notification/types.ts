export interface NotificationOptions {
  title: string;
  body?: string;
  tag?: string;
}

export type NotificationPermissionState = "granted" | "denied" | "default" | "unknown";

export interface NotificationState {
  permission: NotificationPermissionState;
  supported: boolean;
}

export const NOTIFICATION_KEYS = {
  enabled: "notification.enabled",
  notifyUpdates: "notification.notifyUpdates",
  lastNotifiedVersion: "notification.lastNotifiedVersion",
} as const;
