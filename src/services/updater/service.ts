import { type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { UpdateStatus } from "./types";
import { isTauriRuntime } from "../ipc";

type Listener = (status: UpdateStatus) => void;

class UpdaterService {
  private status: UpdateStatus = { state: "idle" };
  private listeners = new Set<Listener>();
  private updateObj: Update | null = null;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private emit(status: UpdateStatus) {
    this.status = status;
    for (const fn of this.listeners) fn(status);
  }

  async check(): Promise<boolean> {
    if (!isTauriRuntime()) {
      this.emit({ state: "not-available" });
      return false;
    }

    this.emit({ state: "checking" });

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (!update) {
        this.emit({ state: "not-available" });
        return false;
      }

      this.updateObj = update;
      this.emit({
        state: "available",
        version: update.version,
        body: update.body,
        date: update.date,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit({ state: "error", message });
      return false;
    }
  }

  async downloadAndInstall(): Promise<void> {
    if (!this.updateObj) return;

    this.emit({ state: "downloading", progress: 0 });

    try {
      await this.updateObj.downloadAndInstall((event) => {
        if (event.event === "Started") {
          const length = event.data.contentLength;
          this.emit({ state: "downloading", progress: 0, contentLength: length });
        } else if (event.event === "Progress") {
          const chunk = event.data.chunkLength;
          const prev =
            this.status.state === "downloading" ? this.status.progress : 0;
          this.emit({
            state: "downloading",
            progress: prev + chunk,
            contentLength:
              this.status.state === "downloading"
                ? this.status.contentLength
                : undefined,
          });
        } else if (event.event === "Finished") {
          this.emit({ state: "downloaded" });
        }
      });

      this.emit({ state: "downloaded" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit({ state: "error", message });
    }
  }

  async install(): Promise<void> {
    await relaunch();
  }

  reset() {
    this.updateObj = null;
    this.emit({ state: "idle" });
  }
}

export const updaterService = new UpdaterService();
