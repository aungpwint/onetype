import { useState } from "react";
import * as backend from "../services/backend";
import { useUiStore } from "../stores/ui-store";
import { useSettingsStore } from "../stores/settings-store";
import { useStudentStore } from "../stores/student-store";
import type { ThemePreference } from "../types";
import { Field, Modal } from "../components/ui";

export default function SettingsPage() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const sound = useUiStore((s) => s.soundEnabled);
  const setSound = useUiStore((s) => s.setSoundEnabled);
  const handGuide = useUiStore((s) => s.handGuideVisible);
  const toggleHandGuide = useUiStore((s) => s.toggleHandGuide);

  const settings = useSettingsStore();
  const active = useStudentStore((s) => s.active);

  const defaultLang = settings.get("app.language");
  const confirmExit = settings.get("practice.confirmExit");

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

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header>
        <p className="eyebrow">Preferences</p>
        <h1 className="mt-1 font-display text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">
          These are stored on this machine only. Nothing here is sent anywhere.
        </p>
      </header>

      <section className="card p-5">
        <h2 className="font-display text-lg">Appearance</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field label="Theme">
            <select
              className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
              value={theme}
              onChange={(e) => setTheme(e.currentTarget.value as ThemePreference)}
            >
              <option value="system">Follow system</option>
              <option value="light">Light desk</option>
              <option value="dark">Night desk</option>
            </select>
          </Field>
          <Field label="Default language">
            <select
              className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
              value={defaultLang}
              onChange={(e) => void settings.set("app.language", e.currentTarget.value)}
            >
              <option value="myanmar">Myanmar (မြန်မာ)</option>
              <option value="english">English</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg">Practice</h2>
        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
            <span>
              <span className="block text-sm">Key click sounds</span>
              <span className="block text-xs text-ink-faint">A short high note on correct, low on error.</span>
            </span>
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
            <span>
              <span className="block text-sm">Hand guide</span>
              <span className="block text-xs text-ink-faint">Show which finger to use next.</span>
            </span>
            <input type="checkbox" checked={handGuide} onChange={toggleHandGuide} className="h-5 w-5 accent-[var(--accent)]" />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
            <span>
              <span className="block text-sm">Confirm before abandoning a round</span>
              <span className="block text-xs text-ink-faint">Prevents tapping Exit and losing a finished attempt.</span>
            </span>
            <input
              type="checkbox"
              checked={confirmExit !== "off"}
              onChange={(e) => void settings.set("practice.confirmExit", e.target.checked ? "on" : "off")}
              className="h-5 w-5 accent-[var(--accent)]"
            />
          </label>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg">Data</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Everything lives in an on-device database. Back it up or move it between machines by exporting.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => void doExport("all")}>
            {busy === "Export all…" ? "Working…" : "Back up everything"}
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy !== null || !active} onClick={() => void doExport("one")}>
            {busy === "Export one…" ? "Working…" : `Back up ${active ? active.displayName : "a learner"}`}
          </button>
          <button type="button" className="btn btn-brass" disabled={busy !== null} onClick={() => void doImport()}>
            {busy === "Import…" ? "Working…" : "Import from backup"}
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          In the browser/dev preview, export downloads a JSON file and import reads one back.
        </p>
      </section>

      <Modal open={report !== null} onClose={() => setReport(null)}>
        <h2 className="font-display text-lg capitalize">{report?.kind}</h2>
        <p className="mt-2 text-sm text-ink-soft">{report?.message}</p>
        <div className="mt-5 flex justify-end">
          <button type="button" className="btn btn-primary" onClick={() => setReport(null)}>
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}