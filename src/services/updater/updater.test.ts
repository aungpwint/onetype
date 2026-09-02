import { describe, it, expect } from "vitest";
import type { UpdateStatus } from "./types";
import {
  CHECK_THROTTLE_MS,
  compareVersions,
  isNewerVersion,
  mapUpdateError,
} from "./types";

describe("update state machine", () => {
  it("idle state exists", () => {
    const s: UpdateStatus = { state: "idle" };
    expect(s.state).toBe("idle");
  });

  it("checking state exists", () => {
    const s: UpdateStatus = { state: "checking" };
    expect(s.state).toBe("checking");
  });

  it("not-available state exists", () => {
    const s: UpdateStatus = { state: "not-available" };
    expect(s.state).toBe("not-available");
  });

  it("available state carries version and body", () => {
    const s: UpdateStatus = {
      state: "available",
      version: "1.2.3",
      body: "Bug fixes",
      date: "2025-01-15",
    };
    expect(s.version).toBe("1.2.3");
    expect(s.body).toBe("Bug fixes");
    expect(s.date).toBe("2025-01-15");
  });

  it("downloading state carries progress", () => {
    const s: UpdateStatus = {
      state: "downloading",
      progress: 500,
      contentLength: 1000,
    };
    expect(s.progress).toBe(500);
    expect(s.contentLength).toBe(1000);
  });

  it("downloading without content length", () => {
    const s: UpdateStatus = {
      state: "downloading",
      progress: 500,
    };
    expect(s.progress).toBe(500);
    expect(s.contentLength).toBeUndefined();
  });

  it("downloaded state exists", () => {
    const s: UpdateStatus = { state: "downloaded" };
    expect(s.state).toBe("downloaded");
  });

  it("installing state exists", () => {
    const s: UpdateStatus = { state: "installing" };
    expect(s.state).toBe("installing");
  });

  it("completed state exists", () => {
    const s: UpdateStatus = { state: "completed" };
    expect(s.state).toBe("completed");
  });

  it("error state carries message", () => {
    const s: UpdateStatus = { state: "error", message: "network" };
    expect(s.message).toBe("network");
  });
});

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("returns 1 when first is greater", () => {
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
  });

  it("returns -1 when first is less", () => {
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
  });

  it("compares major versions", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("1.9.9", "2.0.0")).toBe(-1);
  });

  it("compares minor versions", () => {
    expect(compareVersions("1.2.0", "1.1.9")).toBe(1);
    expect(compareVersions("1.1.9", "1.2.0")).toBe(-1);
  });

  it("handles different length versions", () => {
    expect(compareVersions("1.0.0.1", "1.0.0")).toBe(1);
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
  });
});

describe("isNewerVersion", () => {
  it("returns true when available is newer", () => {
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(true);
    expect(isNewerVersion("1.0.0", "2.0.0")).toBe(true);
  });

  it("returns false when same version", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
  });

  it("returns false when available is older (prevents downgrade)", () => {
    expect(isNewerVersion("1.2.0", "1.1.0")).toBe(false);
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(false);
  });
});

describe("mapUpdateError", () => {
  it("maps network errors", () => {
    expect(mapUpdateError(new Error("network timeout"))).toBe(
      "Unable to check for updates right now."
    );
    expect(mapUpdateError(new Error("ECONNREFUSED"))).toBe(
      "Unable to check for updates right now."
    );
    expect(mapUpdateError(new Error("fetch failed"))).toBe(
      "Unable to check for updates right now."
    );
  });

  it("maps signature errors", () => {
    expect(mapUpdateError(new Error("signature verification failed"))).toBe(
      "The update could not be verified."
    );
    expect(mapUpdateError(new Error("certificate invalid"))).toBe(
      "The update could not be verified."
    );
  });

  it("maps download errors", () => {
    expect(mapUpdateError(new Error("download interrupted"))).toBe(
      "The update could not be downloaded."
    );
    expect(mapUpdateError(new Error("transfer failed"))).toBe(
      "The update could not be downloaded."
    );
  });

  it("maps install errors", () => {
    expect(mapUpdateError(new Error("install failed"))).toBe(
      "The update could not be installed."
    );
    expect(mapUpdateError(new Error("extract error"))).toBe(
      "The update could not be installed."
    );
  });

  it("maps unknown errors", () => {
    expect(mapUpdateError(new Error("something weird"))).toBe(
      "An update error occurred."
    );
    expect(mapUpdateError("string error")).toBe(
      "An update error occurred."
    );
  });
});

describe("check throttle constant", () => {
  it("is 6 hours in milliseconds", () => {
    expect(CHECK_THROTTLE_MS).toBe(6 * 60 * 60 * 1000);
  });
});
