import { describe, it, expect } from "vitest";
import type { UpdateStatus } from "./types";
import { CHECK_THROTTLE_MS } from "./types";

describe("updater types", () => {
  it("idle state exists", () => {
    const s: UpdateStatus = { state: "idle" };
    expect(s.state).toBe("idle");
  });

  it("available state carries version", () => {
    const s: UpdateStatus = {
      state: "available",
      version: "1.2.3",
      body: "Bug fixes",
    };
    expect(s.version).toBe("1.2.3");
    expect(s.body).toBe("Bug fixes");
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

  it("error state carries message", () => {
    const s: UpdateStatus = { state: "error", message: "network" };
    expect(s.message).toBe("network");
  });
});

describe("check throttle constant", () => {
  it("is 6 hours in milliseconds", () => {
    expect(CHECK_THROTTLE_MS).toBe(6 * 60 * 60 * 1000);
  });
});
