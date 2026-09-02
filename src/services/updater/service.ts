import { type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { UpdateStatus } from "./types";
import { isNewerVersion, mapUpdateError } from "./types";
import { isTauriRuntime } from "../ipc";
import { notificationService } from "../notification/service";

type Listener = (status: UpdateStatus) => void;

class UpdaterService {
  private status: UpdateStatus = { state: "idle" };
  private listeners = new Set<Listener>();
  private updateObj: Update | null = null;
  private checking = false;
  private downloading = false;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private emit(status: UpdateStatus) {
    this.status = status;
    for (const fn of this.listeners) fn(status);
  }

  getStatus(): UpdateStatus {
    return this.status;
  }

  async check(currentVersion?: string): Promise<boolean> {
    if (this.checking) return false;
    if (!isTauriRuntime()) {
      this.emit({ state: "not-available" });
      return false;
    }

    this.checking = true;
    this.emit({ state: "checking" });

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (!update) {
        this.emit({ state: "not-available" });
        return false;
      }

      if (currentVersion && !isNewerVersion(currentVersion, update.version)) {
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
      const message = mapUpdateError(err);
      this.emit({ state: "error", message });
      return false;
    } finally {
      this.checking = false;
    }
  }

  async downloadAndInstall(): Promise<void> {
    if (!this.updateObj || this.downloading) return;

    this.downloading = true;
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

      notificationService.send({
        title: "OneType Update Ready",
        body: "The latest update has been downloaded and is ready to install.",
      });
    } catch (err) {
      const message = mapUpdateError(err);
      this.emit({ state: "error", message });
    } finally {
      this.downloading = false;
    }
  }

  async install(): Promise<void> {
    this.emit({ state: "installing" });
    await relaunch();
  }

  reset() {
    this.updateObj = null;
    this.checking = false;
    this.downloading = false;
    this.emit({ state: "idle" });
  }
}

export const updaterService = new UpdaterService();
