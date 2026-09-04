import { useState } from "react";
import { Plus, Pencil, Trash2, UserCheck, CheckCircle2 } from "lucide-react";
import { useStudentStore } from "../stores/student-store";
import type { Student } from "../services/types";
import { Modal } from "../components/ui";
import { StudentForm } from "../components/StudentForm";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export default function StudentsPage() {
  const students = useStudentStore((s) => s.students);
  const active = useStudentStore((s) => s.active);
  const select = useStudentStore((s) => s.select);
  const remove = useStudentStore((s) => s.remove);

  const [editing, setEditing] = useState<Student | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirming, setConfirming] = useState<Student | null>(null);

  const sorted = [...students].sort((a, b) => a.studentCode.localeCompare(b.studentCode));

  return (
    <div className="app-page">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Roll book</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">Learners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One keyboard lab, many learners. The active learner is who lessons and tests are saved for.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="size-4" />
          Add learner
        </Button>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No learners yet — add the first one to open the desk.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((student) => (
            <div key={student.id} className={`card flex items-center gap-4 p-4 transition-colors ${active?.id === student.id ? "border-brass" : ""}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brass text-xl shadow-sm">
                <span aria-hidden>{student.avatar ?? "🐘"}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="ms truncate font-medium">{student.displayName}</p>
                <p className="ms text-xs text-muted-foreground">
                  {student.studentCode} · {student.name}
                </p>
              </div>
              {active?.id === student.id ? (
                <Badge variant="success">
                  <CheckCircle2 className="size-3" />
                  Active now
                </Badge>
              ) : (
                <Button variant="outline" size="sm" onClick={() => void select(student.id)}>
                  <UserCheck className="size-3.5" />
                  Make active
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setEditing(student)}>
                <Pencil className="size-3.5" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirming(student)}>
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showAdd || editing !== null}
        onClose={() => {
          setShowAdd(false);
          setEditing(null);
        }}
      >
        <h2 className="mb-4 pr-8 font-display text-lg">{editing ? `Edit ${editing.displayName}` : "New learner"}</h2>
        <StudentForm
          key={editing?.id ?? "new"}
          student={editing ?? undefined}
          onDone={() => {
            setShowAdd(false);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal open={confirming !== null} onClose={() => setConfirming(null)}>
        <h2 className="pr-8 font-display text-lg">Remove {confirming?.displayName}?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This deletes the learner from the roll — their lessons, sessions and marks will not be recoverable.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirming(null)}>
            Keep
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirming) void remove(confirming.id);
              setConfirming(null);
            }}
          >
            Remove learner
          </Button>
        </div>
      </Modal>
    </div>
  );
}