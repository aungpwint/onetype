import { useState } from "react";
import { useStudentStore } from "../stores/student-store";
import type { Student } from "../services/types";
import { Modal } from "../components/ui";
import { StudentForm } from "../components/StudentForm";

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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Roll book</p>
          <h1 className="mt-1 font-display text-3xl">Learners</h1>
          <p className="mt-1 text-sm text-ink-soft">
            One keyboard lab, many learners. The active learner is who lessons and tests are saved for.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add learner
        </button>
      </header>

      {sorted.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-faint">
          No learners yet — add the first one to open the desk.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((student) => (
            <div key={student.id} className={`card flex items-center gap-4 p-4 ${active?.id === student.id ? "border-brass" : ""}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brass text-xl">
                <span aria-hidden>{student.avatar ?? "🐘"}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="ms truncate font-medium">{student.displayName}</p>
                <p className="ms text-xs text-ink-faint">
                  {student.studentCode} · {student.name}
                </p>
              </div>
              {active?.id === student.id ? (
                <span className="chip border-success/40 text-success">Active now</span>
              ) : (
                <button type="button" className="btn btn-ghost !py-1.5 text-xs" onClick={() => void select(student.id)}>
                  Make active
                </button>
              )}
              <button type="button" className="btn btn-ghost !py-1.5 text-xs" onClick={() => setEditing(student)}>
                Edit
              </button>
              <button type="button" className="btn btn-danger !py-1.5 text-xs" onClick={() => setConfirming(student)}>
                Remove
              </button>
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
        <h2 className="mb-4 font-display text-lg">{editing ? `Edit ${editing.displayName}` : "New learner"}</h2>
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
        <h2 className="font-display text-lg">Remove {confirming?.displayName}?</h2>
        <p className="mt-2 text-sm text-ink-soft">
          This deletes the learner from the roll — their lessons, sessions and marks will not be recoverable.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirming(null)}>
            Keep
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (confirming) void remove(confirming.id);
              setConfirming(null);
            }}
          >
            Remove learner
          </button>
        </div>
      </Modal>
    </div>
  );
}