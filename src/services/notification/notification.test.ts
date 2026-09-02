import { describe, it, expect } from "vitest";
import type { NotificationOptions, NotificationState } from "./types";
import { NOTIFICATION_KEYS } from "./types";

describe("notification types", () => {
  it("NotificationOptions has title", () => {
    const opts: NotificationOptions = { title: "Test" };
    expect(opts.title).toBe("Test");
  });

  it("NotificationOptions supports body and tag", () => {
    const opts: NotificationOptions = {
      title: "Update",
      body: "New version available",
      tag: "update-v1.0.1",
    };
    expect(opts.body).toBe("New version available");
    expect(opts.tag).toBe("update-v1.0.1");
  });

  it("NotificationState tracks permission and support", () => {
    const state: NotificationState = {
      permission: "granted",
      supported: true,
    };
    expect(state.permission).toBe("granted");
    expect(state.supported).toBe(true);
  });

  it("NotificationState can be denied", () => {
    const state: NotificationState = {
      permission: "denied",
      supported: true,
    };
    expect(state.permission).toBe("denied");
  });

  it("NotificationState can be unknown before init", () => {
    const state: NotificationState = {
      permission: "unknown",
      supported: false,
    };
    expect(state.permission).toBe("unknown");
    expect(state.supported).toBe(false);
  });
});

describe("NOTIFICATION_KEYS", () => {
  it("has enabled key", () => {
    expect(NOTIFICATION_KEYS.enabled).toBe("notification.enabled");
  });

  it("has notifyUpdates key", () => {
    expect(NOTIFICATION_KEYS.notifyUpdates).toBe("notification.notifyUpdates");
  });

  it("has lastNotifiedVersion key", () => {
    expect(NOTIFICATION_KEYS.lastNotifiedVersion).toBe(
      "notification.lastNotifiedVersion"
    );
  });
});
