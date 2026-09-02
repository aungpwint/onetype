import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useUiStore } from "../stores/ui-store";
import { useStudentStore } from "../stores/student-store";
import { Modal } from "./ui";
import { StudentForm } from "./StudentForm";
import { listLayouts } from "../core/keyboard-layout/registry";

const NAV = [
  { to: "/", label: "Dashboard", en: "Dashboard" },
  { to: "/learn", label: "Learn", en: "Learn" },
  { to: "/tests", label: "Timed tests", en: "Timed tests" },
  { to: "/progress", label: "Progress", en: "Progress" },
  { to: "/teacher", label: "Teacher", en: "Teacher" },
  { to: "/students", label: "Students", en: "Students" },
  { to: "/settings", label: "Settings", en: "Settings" },
];

function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const label = next === "system" ? "Follow system" : next === "light" ? "Light theme" : "Dark theme";
  return (
    <button
      type="button"
      className="btn btn-ghost !border-transparent !px-2 !py-1.5 text-xs"
      onClick={() => setTheme(next)}
      title={label}
      aria-label={label}
    >
      {theme === "dark" ? "◐" : theme === "light" ? "☀" : "◑"}
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const handGuide = useUiStore((s) => s.handGuideVisible);
  const toggleHandGuide = useUiStore((s) => s.toggleHandGuide);
  const sound = useUiStore((s) => s.soundEnabled);
  const setSound = useUiStore((s) => s.setSoundEnabled);
  const students = useStudentStore((s) => s.students);
  const active = useStudentStore((s) => s.active);
  const select = useStudentStore((s) => s.select);
  const navigate = useNavigate();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const layoutCount = listLayouts().length;
  const activeCount = students.filter((s) => s.active).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <AnimatePresence initial={false}>
        {sidebarOpen ? (
          <motion.aside
            key="rail"
            className="flex w-60 shrink-0 flex-col border-r border-line bg-paper-2"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              className="flex items-center gap-2.5 px-5 pb-4 pt-5 text-left"
              onClick={() => navigate("/")}
              aria-label="Back to dashboard"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-display text-lg font-bold text-accent-ink">
                oT
              </span>
              <span className="font-display text-lg leading-none">
                OneType
                <span className="ms block text-xs text-ink-faint">အွန်းတိုက်</span>
              </span>
            </button>

            <nav className="mx-3 flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Primary">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive ? "bg-accent text-accent-ink font-medium" : "text-ink-soft hover:bg-paper-2 hover:text-ink"
                    }`
                  }
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${"translate-none"}`}
                    style={{ background: "var(--brass)" }}
                    aria-hidden
                  />
                  <span className="ms">{item.en}</span>
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-line p-3">
              {active ? (
                <button type="button" className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-paper" onClick={() => setPickerOpen(true)}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brass font-mono text-xs font-bold text-paper">
                    {active.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{active.displayName}</span>
                    <span className="ms block truncate text-xs text-ink-faint">{active.studentCode}</span>
                  </span>
                  <span className="ml-auto text-xs text-ink-faint">▾</span>
                </button>
              ) : null}
              <div className="mt-2 flex items-center justify-between gap-1">
                <ThemeToggle />
                <button
                  type="button"
                  className="btn btn-ghost !border-transparent !px-2 !py-1.5 text-xs"
                  onClick={() => setSound(!sound)}
                  title={sound ? "Mute key sounds" : "Enable key sounds"}
                  aria-label={sound ? "Mute key sounds" : "Enable key sounds"}
                >
                  {sound ? "♪" : "∅"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost !border-transparent !px-2 !py-1.5 text-xs"
                  onClick={toggleHandGuide}
                  title={handGuide ? "Hide hand guide" : "Show hand guide"}
                  aria-label={handGuide ? "Hide hand guide" : "Show hand guide"}
                >
                  ✋
                </button>
              </div>
              <p className="mt-3 px-1 text-[0.65rem] leading-snug text-ink-faint">
                {layoutCount} layouts · {activeCount > 0 ? "solo learner" : "no learner selected"}
              </p>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
          <button type="button" className="btn btn-ghost !border-transparent !px-2" onClick={toggleSidebar} aria-label="Toggle sidebar">
            ☰
          </button>
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            <span className="hidden md:inline">OneType keyboard lab</span>
            <span aria-hidden>·</span>
            <span className="hidden md:inline">QWERTY + Myanmar3</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="btn btn-primary !py-1.5 text-xs" onClick={() => setAddOpen(true)}>
              + Add student
            </button>
            <button type="button" className="btn btn-ghost !py-1.5 text-xs" onClick={() => setPickerOpen(true)}>
              {active ? active.displayName : "No learner"}
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Choose a learner</h2>
          <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => setPickerOpen(false)}>
            Esc
          </button>
        </div>
        <ul className="space-y-2">
          {students.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  active?.id === student.id ? "border-brass bg-paper-2" : "border-line hover:border-line-strong"
                }`}
                onClick={() => {
                  void select(student.id);
                  setPickerOpen(false);
                }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass font-mono text-xs font-bold text-paper">
                  {student.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{student.displayName}</span>
                  <span className="ms block text-xs text-ink-faint">{student.studentCode}</span>
                </span>
                {active?.id === student.id ? <span className="ml-auto text-xs text-accent">Active</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-ghost mt-4 w-full" onClick={() => setAddOpen(true)}>
          Add a new student
        </button>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <h2 className="mb-4 font-display text-lg">New learner</h2>
        <StudentForm
          onDone={(created) => {
            setAddOpen(false);
            if (created) navigate("/");
          }}
        />
      </Modal>
    </div>
  );
}