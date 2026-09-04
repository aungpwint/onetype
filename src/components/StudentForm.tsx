import { useState } from "react";
import { useStudentStore } from "../stores/student-store";
import type { Student } from "../services/types";
import { Field } from "./ui";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const AVATARS = ["🐘", "🦚", "🦋", "🐠", "⭐", "🚀", "📚", "🌴"];

export function StudentForm({ student, onDone }: { student?: Student; onDone?: (created: Student | null) => void }) {
  const create = useStudentStore((s) => s.create);
  const update = useStudentStore((s) => s.update);
  const select = useStudentStore((s) => s.select);
  const error = useStudentStore((s) => s.error);

  const [name, setName] = useState(student?.name ?? "");
  const [displayName, setDisplayName] = useState(student?.displayName ?? "");
  const [avatar, setAvatar] = useState(student?.avatar ?? "🐘");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!name.trim()) {
      setMessage("A learner needs a name.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (student) {
        const updated = await update({ id: student.id, name: name.trim(), displayName: displayName.trim() || null, avatar });
        onDone?.(updated);
      } else {
        const created = await create({ name: name.trim(), displayName: displayName.trim() || null });
        await select(created.id);
        onDone?.(created);
      }
    } catch {
      setMessage("Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Field label="Full name" hint="As it appears on the teacher's roll.">
        <Input value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="e.g. Aye Aye" autoFocus />
      </Field>
      <Field label="Display name" hint="Optional — a short nickname.">
        <Input value={displayName} onChange={(e) => setDisplayName(e.currentTarget.value)} placeholder="e.g. Aye" />
      </Field>
      <Field label="Mark">
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                avatar === a ? "border-brass bg-muted" : "border-border hover:border-border"
              }`}
              aria-label={`Use mark ${a}`}
              onClick={() => setAvatar(a)}
            >
              <span aria-hidden>{a}</span>
            </button>
          ))}
        </div>
      </Field>
      {student ? (
        <p className="ms text-xs text-muted-foreground">
          Code <span className="font-mono">{student.studentCode}</span> — kept for the teacher's roll.
        </p>
      ) : null}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={() => onDone?.(null)}>
          Cancel
        </Button>
        <Button disabled={busy} onClick={submit}>
          {busy ? "Saving…" : student ? "Save changes" : "Add learner"}
        </Button>
      </div>
    </div>
  );
}