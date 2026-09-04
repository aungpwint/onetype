import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useStudentStore } from "../stores/student-store";
import { useSettingsStore } from "../stores/settings-store";
import { useUiStore } from "../stores/ui-store";
import { Field } from "./ui";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function Onboarding() {
  const navigate = useNavigate();
  const create = useStudentStore((s) => s.create);
  const select = useStudentStore((s) => s.select);
  const students = useStudentStore((s) => s.students);
  const setSetting = useSettingsStore((s) => s.set);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [defaultLang, setDefaultLang] = useState<"myanmar" | "english">("myanmar");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const begin = async () => {
    if (!name.trim()) {
      setMessage("Give the learner a name to open the desk.");
      return;
    }
    setBusy(true);
    try {
      if (students.length === 0) {
        const created = await create({ name: name.trim(), displayName: displayName.trim() || null });
        await select(created.id);
      }
      await setSetting("app.language", defaultLang);
      await setSetting("design.theme", theme);
      navigate("/", { replace: true });
    } catch {
      setMessage("Something went wrong opening the desk. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="border-b border-border bg-muted/60 px-8 py-6">
            <p className="eyebrow">Desk № 1 · First lesson</p>
            <h1 className="mt-2 flex items-center gap-2 font-display text-3xl">
              OneType <Sparkles className="size-6 text-brass" />
              <span className="ms text-2xl text-muted-foreground">ဝမ်းတိုက်</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Learn to touch-type English and Myanmar without looking at your hands. Your progress lives on this machine — nothing leaves
              it.
            </p>
          </div>
          <div className="space-y-4 px-8 py-6">
            <Field label="Learner's full name" hint="Goes on the teacher's roll.">
              <Input
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder="e.g. Aye Aye"
                autoFocus
              />
            </Field>
            <Field label="Display name" hint="Optional nickname.">
              <Input value={displayName} onChange={(e) => setDisplayName(e.currentTarget.value)} placeholder="Aye" />
            </Field>
            <Field label="Start language">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDefaultLang("myanmar")}
                  className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    defaultLang === "myanmar" ? "border-brass bg-muted" : "border-border hover:border-border"
                  }`}
                >
                  <span className="ms text-2xl leading-none">မြန်မာ</span>
                  <span className="ms mt-1 block text-xs text-muted-foreground">Myanmar3 layout</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultLang("english")}
                  className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    defaultLang === "english" ? "border-brass bg-muted" : "border-border hover:border-border"
                  }`}
                >
                  <span className="text-2xl font-semibold leading-none">Aa</span>
                  <span className="mt-1 block text-xs text-muted-foreground">QWERTY layout</span>
                </button>
              </div>
            </Field>
            <div className="flex items-center justify-between">
              <Field label="Appearance">
                <select
                  className="flex h-9 w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-brass focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  value={theme}
                  onChange={(e) => setTheme(e.currentTarget.value as typeof theme)}
                >
                  <option value="system">Follow system</option>
                  <option value="light">Light desk</option>
                  <option value="dark">Night desk</option>
                </select>
              </Field>
            </div>
            {message ? <p className="text-sm text-destructive">{message}</p> : null}
            <Button variant="brass" size="lg" className="w-full" disabled={busy} onClick={begin}>
              {busy ? "Opening the desk…" : "Open the desk"}
            </Button>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Every key you press here stays on this device. No account, no cloud.
        </p>
      </div>
    </div>
  );
}