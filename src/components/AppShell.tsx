import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Timer,
  TrendingUp,
  GraduationCap,
  Users,
  Settings,
  Sun,
  Moon,
  Monitor,
  Volume2,
  VolumeX,
  Hand,
  PanelsTopLeft,
  Plus,
  ChevronDown,
  UserRound,
} from "lucide-react";
import { useUiStore } from "../stores/ui-store";
import { useStudentStore } from "../stores/student-store";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { Modal } from "./ui";
import { StudentForm } from "./StudentForm";
import { listLayouts } from "../core/keyboard-layout/registry";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const NAV = [
  { to: "/", label: "Dashboard", en: "Dashboard", icon: LayoutDashboard },
  { to: "/learn", label: "Learn", en: "Learn", icon: BookOpen },
  { to: "/drill", label: "Adaptive drill", en: "Adaptive drill", icon: Target },
  { to: "/tests", label: "Timed tests", en: "Timed tests", icon: Timer },
  { to: "/progress", label: "Progress", en: "Progress", icon: TrendingUp },
  { to: "/teacher", label: "Teacher", en: "Teacher", icon: GraduationCap },
  { to: "/students", label: "Students", en: "Students", icon: Users },
  { to: "/settings", label: "Settings", en: "Settings", icon: Settings },
];

function IconButton({
  label,
  onClick,
  icon,
  active,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={active ? "bg-accent/10 text-accent" : "text-muted-foreground"}
          onClick={onClick}
          aria-label={label}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const label = next === "system" ? "Follow system" : next === "light" ? "Light theme" : "Dark theme";
  const icon =
    theme === "dark" ? <Moon className="size-4" /> : theme === "light" ? <Sun className="size-4" /> : <Monitor className="size-4" />;
  return <IconButton label={label} onClick={() => setTheme(next)} icon={icon} />;
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
  useKeyboardShortcuts();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const layoutCount = listLayouts().length;
  const activeCount = students.filter((s) => s.active).length;

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
      <AnimatePresence initial={false}>
        {sidebarOpen ? (
          <motion.aside
            key="rail"
            className="flex w-60 shrink-0 flex-col border-r border-border bg-card"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
              <button
                type="button"
                className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                onClick={() => navigate("/")}
                aria-label="Back to dashboard"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-display text-lg font-bold text-accent-ink shadow-sm">
                  oT
                </span>
                <span className="font-display text-lg leading-none">
                  OneType
                  <span className="ms block text-xs text-muted-foreground">ဝမ်းတိုက်</span>
                </span>
              </button>
            </div>

            <nav className="mx-3 flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Primary">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive ? "bg-accent text-accent-ink font-medium shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`
                  }
                >
                  <item.icon className="size-4 opacity-70" />
                  <span>{item.en}</span>
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-border p-3">
              {active ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                  onClick={() => setPickerOpen(true)}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brass font-mono text-xs font-bold text-card shadow-sm">
                    {active.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{active.displayName}</span>
                    <span className="ms block truncate text-xs text-muted-foreground">{active.studentCode}</span>
                  </span>
                  <ChevronDown className="ml-auto size-4 text-muted-foreground" />
                </button>
              ) : null}
              <div className="mt-2 flex items-center justify-between">
                <ThemeToggle />
                <IconButton
                  label={sound ? "Mute key sounds" : "Enable key sounds"}
                  onClick={() => setSound(!sound)}
                  icon={sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                />
                <IconButton
                  label={handGuide ? "Hide hand guide" : "Show hand guide"}
                  onClick={toggleHandGuide}
                  icon={<Hand className="size-4" />}
                  active={handGuide}
                />
              </div>
              <p className="mt-3 px-1 text-[0.6875rem] leading-snug text-muted-foreground">
                {layoutCount} layouts · {activeCount > 0 ? "solo learner" : "no learner selected"}
              </p>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
                <PanelsTopLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden md:inline">OneType keyboard lab</span>
            <span aria-hidden>·</span>
            <span className="hidden md:inline">QWERTY + Myanmar3</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add student</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <UserRound className="size-4" />
              {active ? active.displayName : "No learner"}
            </Button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div className="mb-4 flex items-center justify-between pr-8">
          <h2 className="font-display text-lg">Choose a learner</h2>
        </div>
        <ul className="space-y-2">
          {students.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active?.id === student.id ? "border-brass bg-muted" : "border-border hover:border-border"
                }`}
                onClick={() => {
                  void select(student.id);
                  setPickerOpen(false);
                }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass font-mono text-xs font-bold text-card shadow-sm">
                  {student.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{student.displayName}</span>
                  <span className="ms block text-xs text-muted-foreground">{student.studentCode}</span>
                </span>
                {active?.id === student.id ? <span className="ml-auto text-xs font-medium text-accent">Active</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <Button variant="outline" className="mt-4 w-full" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add a new student
        </Button>
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
    </TooltipProvider>
  );
}