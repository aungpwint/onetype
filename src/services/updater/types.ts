export type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "not-available" }
  | { state: "available"; version: string; body?: string; date?: string }
  | { state: "downloading"; progress: number; contentLength?: number }
  | { state: "downloaded" }
  | { state: "error"; message: string };

export interface UpdateMetadata {
  version: string;
  body?: string;
  currentVersion: string;
  date?: string;
}

export const CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours
