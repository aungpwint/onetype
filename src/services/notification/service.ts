import { isTauriRuntime } from "../ipc";
import type { NotificationOptions, NotificationState } from "./types";

class NotificationService {
  private state: NotificationState = { permission: "unknown", supported: false };
  private listeners = new Set<(state: NotificationState) => void>();
  private sentTags = new Set<string>();

  async init(): Promise<void> {
    if (!isTauriRuntime()) {
      this.state = { permission: "granted", supported: "Notification" in window };
      this.emit();
      return;
    }

    try {
      const { isPermissionGranted, requestPermission } = await import(
        "@tauri-apps/plugin-notification"
      );
      const granted = await isPermissionGranted();
      this.state = {
        permission: granted ? "granted" : "default",
        supported: true,
      };
      this.emit();

      if (!granted) {
        const result = await requestPermission();
        this.state = {
          permission: result === "granted" ? "granted" : "denied",
          supported: true,
        };
        this.emit();
      }
    } catch {
      this.state = { permission: "denied", supported: false };
      this.emit();
    }
  }

  subscribe(fn: (state: NotificationState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state);
  }

  getState(): NotificationState {
    return this.state;
  }

  async send(options: NotificationOptions): Promise<boolean> {
    if (this.state.permission !== "granted") return false;
    if (options.tag && this.sentTags.has(options.tag)) return false;

    if (isTauriRuntime()) {
      try {
        const { sendNotification } = await import(
          "@tauri-apps/plugin-notification"
        );
        sendNotification({
          title: options.title,
          body: options.body,
        });
        if (options.tag) this.sentTags.add(options.tag);
        return true;
      } catch {
        return false;
      }
    }

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new window.Notification(options.title, { body: options.body });
        if (options.tag) this.sentTags.add(options.tag);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  markTagSent(tag: string): void {
    this.sentTags.add(tag);
  }

  isTagSent(tag: string): boolean {
    return this.sentTags.has(tag);
  }

  resetTag(tag: string): void {
    this.sentTags.delete(tag);
  }
}

export const notificationService = new NotificationService();
