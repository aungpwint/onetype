import { useState, useEffect, useRef, useCallback } from "react";
import { updaterService } from "./service";
import type { UpdateStatus } from "./types";
import { useSettingsStore } from "../../stores/settings-store";
import { CHECK_THROTTLE_MS } from "./types";
import { notificationService } from "../notification/service";

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ state: "idle" });
  const autoUpdate = useSettingsStore((s) => s.get("app.autoUpdate"));

  useEffect(() => {
    return updaterService.subscribe(setStatus);
  }, []);

  const check = useCallback(() => updaterService.check(), []);
  const downloadAndInstall = useCallback(() => updaterService.downloadAndInstall(), []);
  const install = useCallback(() => updaterService.install(), []);

  return { status, check, downloadAndInstall, install, autoUpdate };
}

export function useStartupUpdateCheck() {
  const lastChecked = useSettingsStore((s) => s.get("updater.lastChecked"));
  const autoUpdate = useSettingsStore((s) => s.get("app.autoUpdate"));
  const setSetting = useSettingsStore((s) => s.set);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    if (autoUpdate === "off") return;

    const now = Date.now();
    const last = Number(lastChecked) || 0;
    if (now - last < CHECK_THROTTLE_MS) return;

    checked.current = true;
    void updaterService.check().then(async (available) => {
      await setSetting("updater.lastChecked", String(now));

      if (available) {
        const status = updaterService.getStatus();
        if (status.state === "available") {
          const notifyUpdates = useSettingsStore.getState().get("notification.notifyUpdates");
          const lastNotified = useSettingsStore.getState().get("notification.lastNotifiedVersion");
          if (notifyUpdates !== "off" && status.version !== lastNotified) {
            await notificationService.send({
              title: "OneType Update Available",
              body: `A new version of OneType is available. Click to view the update.`,
            });
            await setSetting("notification.lastNotifiedVersion", status.version);
          }
        }
      }
    });
  }, [autoUpdate, lastChecked, setSetting]);
}
