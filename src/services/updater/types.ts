export type UpdateState =
  | "idle"
  | "checking"
  | "not-available"
  | "available"
  | "downloading"
  | "downloaded"
  | "installing"
  | "completed"
  | "error";

export type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "not-available" }
  | { state: "available"; version: string; body?: string; date?: string }
  | { state: "downloading"; progress: number; contentLength?: number }
  | { state: "downloaded" }
  | { state: "installing" }
  | { state: "completed" }
  | { state: "error"; message: string };

export interface UpdateMetadata {
  version: string;
  body?: string;
  currentVersion: string;
  date?: string;
}

export const CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours

export const UPDATE_EVENTS = {
  CHECK_STARTED: "update:check:started",
  CHECK_COMPLETED: "update:check:completed",
  AVAILABLE: "update:available",
  NOT_AVAILABLE: "update:not-available",
  DOWNLOAD_STARTED: "update:download:started",
  DOWNLOAD_PROGRESS: "update:download:progress",
  DOWNLOAD_COMPLETED: "update:download:completed",
  READY: "update:ready",
  INSTALL_STARTED: "update:install:started",
  COMPLETED: "update:completed",
  FAILED: "update:failed",
} as const;

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function isNewerVersion(current: string, available: string): boolean {
  return compareVersions(available, current) > 0;
}

export function mapUpdateError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/network|fetch|connect|timeout|ECONNREFUSED/i.test(message)) {
    return "Unable to check for updates right now.";
  }
  if (/signature|verify|certificate/i.test(message)) {
    return "The update could not be verified.";
  }
  if (/download|transfer/i.test(message)) {
    return "The update could not be downloaded.";
  }
  if (/install|extract|space|ENOSPC|disk/i.test(message)) {
    return "The update could not be installed.";
  }
  return "An update error occurred.";
}
