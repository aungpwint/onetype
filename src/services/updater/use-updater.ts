import { useState, useEffect, useRef, useCallback } from "react";
import { updaterService } from "./service";
import type { UpdateStatus } from "./types";
import { useSettingsStore } from "../../stores/settings-store";
import { CHECK_THROTTLE_MS } from "./types";

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
    void updaterService.check().then(() => {
      void setSetting("updater.lastChecked", String(now));
    });
  }, [autoUpdate, lastChecked, setSetting]);
}
