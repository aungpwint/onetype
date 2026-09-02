import { useState } from "react";
import { useStudentStore } from "../stores/student-store";
import type { Student } from "../services/types";
import { Field, inputClass } from "./ui";

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
        <input className={inputClass} value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="e.g. Aye Aye" autoFocus />
      </Field>
      <Field label="Display name" hint="Optional — a short nickname.">
        <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.currentTarget.value)} placeholder="e.g. Aye" />
      </Field>
      <Field label="Mark">
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition-colors ${
                avatar === a ? "border-brass bg-paper-2" : "border-line hover:border-line-strong"
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
        <p className="ms text-xs text-ink-faint">
          Code <span className="font-mono">{student.studentCode}</span> — kept for the teacher's roll.
        </p>
      ) : null}
      {message ? <p className="text-sm text-alert">{message}</p> : null}
      {error ? <p className="text-sm text-alert">{error}</p> : null}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={() => onDone?.(null)}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? "Saving…" : student ? "Save changes" : "Add learner"}
        </button>
      </div>
    </div>
  );
}