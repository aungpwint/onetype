import { useState } from "react";
import {
  Palette,
  Keyboard,
  Bell,
  Database,
  DownloadCloud,
  UploadCloud,
  RefreshCw,
  Download,
  HardDrive,
  Volume2,
  Paintbrush,
  Hand,
  LogOut,
} from "lucide-react";
import * as backend from "../services/backend";
import { useUiStore } from "../stores/ui-store";
import { useSettingsStore } from "../stores/settings-store";
import { useStudentStore } from "../stores/student-store";
import { useUpdater } from "../services/updater/use-updater";
import type { ThemePreference } from "../types";
import { Field, Modal } from "../components/ui";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";

export default function SettingsPage() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const sound = useUiStore((s) => s.soundEnabled);
  const setSound = useUiStore((s) => s.setSoundEnabled);
  const handGuide = useUiStore((s) => s.handGuideVisible);
  const toggleHandGuide = useUiStore((s) => s.toggleHandGuide);

  const settings = useSettingsStore();
  const active = useStudentStore((s) => s.active);
  const updater = useUpdater();

  const defaultLang = settings.get("app.language");
  const confirmExit = settings.get("practice.confirmExit");
  const notificationsEnabled = settings.get("notification.enabled");
  const notifyUpdates = settings.get("notification.notifyUpdates");

  const [report, setReport] = useState<{ kind: "export" | "import"; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const doExport = async (scope: "all" | "one") => {
    setBusy(`Export ${scope}…`);
    try {
      const result = await backend.exportBackup(scope === "all" ? null : active?.id ?? null);
      if (result) setReport({ kind: "export", message: `Saved backup to ${result.path}` });
      else setReport({ kind: "export", message: "Export cancelled." });
    } catch (error) {
      setReport({ kind: "export", message: `Export failed: ${error instanceof Error ? error.message : error}` });
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    setBusy("Import…");
    try {
      const result = await backend.importBackup();
      if (result) {
        setReport({ kind: "import", message: `Imported ${result.importedStudents} learner(s).${result.skippedStudents.length ? ` Skipped: ${result.skippedStudents.join(", ")}` : ""}` });
        await useStudentStore.getState().load();
      } else {
        setReport({ kind: "import", message: "Import cancelled." });
      }
    } catch (error) {
      setReport({ kind: "import", message: `Import failed: ${error instanceof Error ? error.message : error}` });
    } finally {
      setBusy(null);
    }
  };

  const doHealthCheck = async () => {
    setBusy("Check…");
    try {
      const message = await backend.checkDatabaseIntegrity();
      setReport({ kind: "import", message });
    } catch (error) {
      setReport({ kind: "import", message: `Health check failed: ${error instanceof Error ? error.message : error}` });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="app-page">
      <header>
        <p className="eyebrow">Preferences</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These are stored on this machine only. Nothing here is sent anywhere.
        </p>
      </header>

      <Section icon={<Palette className="size-4" />} title="Appearance">
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field label="Theme">
            <div className="relative">
              <select
                className="flex h-9 w-44 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-brass focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                value={theme}
                onChange={(e) => setTheme(e.currentTarget.value as ThemePreference)}
              >
                <option value="system">Follow system</option>
                <option value="light">Light desk</option>
                <option value="dark">Night desk</option>
              </select>
            </div>
          </Field>
          <Field label="Default language">
            <div className="relative">
              <select
                className="flex h-9 w-44 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-brass focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                value={defaultLang}
                onChange={(e) => void settings.set("app.language", e.currentTarget.value)}
              >
                <option value="myanmar">Myanmar (မြန်မာ)</option>
                <option value="english">English</option>
              </select>
            </div>
          </Field>
        </div>
      </Section>

      <Section icon={<Keyboard className="size-4" />} title="Practice">
        <div className="mt-4 space-y-3">
          <SettingRow title="Key click sounds" description="A short high note on correct, low on error." checked={sound} onChecked={(v) => setSound(v)} icon={Volume2} />
          <SettingRow title="Hand guide" description="Show which finger to use next." checked={handGuide} onChecked={toggleHandGuide} icon={Hand} />
          <SettingRow
            title="Confirm before abandoning a round"
            description="Prevents tapping Exit and losing a finished attempt."
            checked={confirmExit !== "off"}
            onChecked={(v) => void settings.set("practice.confirmExit", v ? "on" : "off")}
            icon={LogOut}
          />
        </div>
      </Section>

      <Section icon={<Paintbrush className="size-4" />} title="Keyboard shortcuts">
        <p className="mt-1 text-sm text-muted-foreground">
          Navigate the app without the mouse. During a round, plain keys are reserved for typing.
        </p>
        <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {[
            ["Ctrl / Cmd + 1…5", "Dashboard, Learn, Tests, Progress, Settings"],
            ["Ctrl / Cmd + ,", "Settings"],
            ["Ctrl / Cmd + Shift + T", "Timed tests"],
            ["Ctrl / Cmd + Shift + L", "Learn"],
            ["Esc", "Pause / resume a round"],
            ["R", "Restart round (ready or paused)"],
          ].map(([keys, desc]) => (
            <div key={keys} className="flex items-start justify-between gap-3">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{keys}</span>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </dl>
      </Section>

      <Section icon={<Bell className="size-4" />} title="Notifications">
        <div className="mt-4 space-y-3">
          <SettingRow
            title="Enable notifications"
            description="Allow OneType to send native OS notifications."
            checked={notificationsEnabled !== "off"}
            onChecked={(v) => void settings.set("notification.enabled", v ? "on" : "off")}
            icon={Bell}
          />
          <SettingRow
            title="Notify about application updates"
            description="Show a notification when a new version is available."
            checked={notifyUpdates !== "off"}
            onChecked={(v) => void settings.set("notification.notifyUpdates", v ? "on" : "off")}
            icon={Download}
          />
        </div>
      </Section>

      <Section icon={<DownloadCloud className="size-4" />} title="Updates">
        <div className="mt-4 space-y-3">
          <SettingRow
            title="Check for updates automatically"
            description="OneType will check every 6 hours. You can also check manually below."
            checked={updater.autoUpdate !== "off"}
            onChecked={(v) => void settings.set("app.autoUpdate", v ? "on" : "off")}
            icon={DownloadCloud}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={updater.status.state === "checking"}
            onClick={updater.check}
          >
            {updater.status.state === "checking" ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Checking…
              </>
            ) : updater.status.state === "available" ? (
              `Update available (v${updater.status.version})`
            ) : updater.status.state === "downloaded" ? (
              "Update ready to install"
            ) : (
              "Check for updates"
            )}
          </Button>
          {updater.status.state === "available" && (
            <Button variant="brass" onClick={updater.downloadAndInstall}>
              <Download className="size-4" />
              Download &amp; install
            </Button>
          )}
          {updater.status.state === "downloaded" && (
            <Button onClick={updater.install}>
              <RefreshCw className="size-4" />
              Restart now
            </Button>
          )}
          {updater.status.state === "error" && (
            <span className="text-xs text-destructive">{updater.status.message}</span>
          )}
        </div>
      </Section>

      <Section icon={<Database className="size-4" />} title="Data">
        <p className="mt-1 text-sm text-muted-foreground">
          Everything lives in an on-device database. Back it up or move it between machines by exporting.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy !== null} onClick={() => void doExport("all")}>
            {busy === "Export all…" ? (
              <><RefreshCw className="size-4 animate-spin" />Working…</>
            ) : (
              <><DownloadCloud className="size-4" />Back up everything</>
            )}
          </Button>
          <Button variant="outline" disabled={busy !== null || !active} onClick={() => void doExport("one")}>
            {busy === "Export one…" ? (
              <><RefreshCw className="size-4 animate-spin" />Working…</>
            ) : (
              <><HardDrive className="size-4" />Back up {active ? active.displayName : "a learner"}</>
            )}
          </Button>
          <Button variant="brass" disabled={busy !== null} onClick={() => void doImport()}>
            {busy === "Import…" ? (
              <><RefreshCw className="size-4 animate-spin" />Working…</>
            ) : (
              <><UploadCloud className="size-4" />Import from backup</>
            )}
          </Button>
          <Button variant="outline" disabled={busy !== null} onClick={doHealthCheck}>
            {busy === "Check…" ? (
              <><RefreshCw className="size-4 animate-spin" />Checking…</>
            ) : (
              <><RefreshCw className="size-4" />Check database health</>
            )}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          In the browser/dev preview, export downloads a JSON file and import reads one back.
        </p>
      </Section>

      <Modal open={report !== null} onClose={() => setReport(null)}>
        <h2 className="font-display text-lg capitalize">{report?.kind}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{report?.message}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setReport(null)}>Done</Button>
        </div>
      </Modal>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-lg">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChecked,
  icon: Icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChecked: (v: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/40">
      <span className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span>
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={onChecked} />
    </label>
  );
}
