import { useState } from 'react'
import { Plus, Pencil, Trash2, UserCheck, CheckCircle2 } from 'lucide-react'
import { useStudentStore } from '@/stores/student-store'
import type { Student } from '@/services/types'
import { Modal, PageHeader, EmptyState } from '@/components/ui'
import { StudentForm } from '@/components/student-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, cardClass, appPageClass, sectionTitleClass, highlightClass } from '@/lib/utils'

export default function StudentsPage() {
    const students = useStudentStore((s) => s.students)
    const active = useStudentStore((s) => s.active)
    const select = useStudentStore((s) => s.select)
    const remove = useStudentStore((s) => s.remove)

    const [editing, setEditing] = useState<Student | null>(null)
    const [showAdd, setShowAdd] = useState(false)
    const [confirming, setConfirming] = useState<Student | null>(null)

    const sorted = [...students].sort((a, b) => a.studentCode.localeCompare(b.studentCode))

    return (
        <div className={appPageClass}>
            <PageHeader
                eyebrow="Roll book"
                title="Learners"
                subtitle="One keyboard lab, many learners. The active learner is who lessons and tests are saved for."
            >
                <Button onClick={() => setShowAdd(true)}>
                    <Plus className="size-4" />
                    Add learner
                </Button>
            </PageHeader>

            {sorted.length === 0 ? (
                <EmptyState title="No learners yet">Add the first one to open the desk.</EmptyState>
            ) : (
                <div className="space-y-2">
                    {sorted.map((student) => (
                        <div
                            key={student.id}
                            className={cn(
                                cardClass,
                                'flex items-center gap-4 p-4 transition-colors',
                                active?.id === student.id ? highlightClass : '',
                            )}
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xl shadow-sm">
                                <span aria-hidden>{student.avatar ?? '🐘'}</span>
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-myanmar font-medium">{student.displayName}</p>
                                <p className="font-myanmar text-xs text-muted-foreground">
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
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setConfirming(student)}
                            >
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
                    setShowAdd(false)
                    setEditing(null)
                }}
                ariaLabel={editing ? `Edit ${editing.displayName}` : 'New learner'}
            >
                <h2 className={cn(sectionTitleClass, 'mb-4 pr-8')}>{editing ? `Edit ${editing.displayName}` : 'New learner'}</h2>
                <StudentForm
                    key={editing?.id ?? 'new'}
                    student={editing ?? undefined}
                    onDone={() => {
                        setShowAdd(false)
                        setEditing(null)
                    }}
                />
            </Modal>

            <Modal open={confirming !== null} onClose={() => setConfirming(null)} ariaLabel="Remove learner">
                <h2 className={cn(sectionTitleClass, 'pr-8')}>Remove {confirming?.displayName}?</h2>
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
                            if (confirming) void remove(confirming.id)
                            setConfirming(null)
                        }}
                    >
                        Remove learner
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
