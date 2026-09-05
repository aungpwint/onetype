import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { initUi, useUiStore } from "./stores/ui-store";
import { useStudentStore } from "./stores/student-store";
import { useSettingsStore } from "./stores/settings-store";
import { useStartupUpdateCheck } from "./services/updater/use-updater";
import { notificationService } from "./services/notification/service";
import { Shell } from "./components/AppShell";
import { UpdateBanner } from "./components/UpdateBanner";
import { UpdateDialog } from "./components/UpdateDialog";
import { Onboarding } from "./components/Onboarding";
import { Spinner } from "./components/ui";

// Routes are code-split so the typing session loads only the module it needs;
// navigating back to the dashboard reuses the cached chunk immediately.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Learn = lazy(() => import("./pages/Learn"));
const TestsPage = lazy(() => import("./pages/TestsPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const TeacherPage = lazy(() => import("./pages/TeacherPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

// The three session surfaces live in one module; expose each as its own lazy
// boundary so the bundle splits once but every route resolves to it.
const LessonPage = lazy(() =>
  import("./pages/SessionPage").then((m) => ({ default: m.LessonPage })),
);
const TestSessionPage = lazy(() =>
  import("./pages/SessionPage").then((m) => ({ default: m.TestPage })),
);
const DrillPage = lazy(() =>
  import("./pages/SessionPage").then((m) => ({ default: m.DrillPage })),
);

function PageLoader() {
  return <Spinner label="Loading…" />;
}

function Boot() {
  useStartupUpdateCheck();
  useEffect(() => {
    initUi();
    void useUiStore.getState().setTheme(useUiStore.getState().theme);
    void useSettingsStore.getState().load();
    void useStudentStore.getState().load();
    void notificationService.init();
  }, []);
  return null;
}

export default function App() {
  const loaded = useStudentStore((s) => s.loaded);
  const loading = useStudentStore((s) => s.loading);
  const students = useStudentStore((s) => s.students);
  const location = useLocation();

  const needsOnboarding = students.length === 0 || location.pathname === "/onboarding";

  return (
    <>
      <Boot />
      <UpdateDialog />
      {!loaded || loading ? (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <Spinner label="Opening the desk…" />
        </div>
      ) : needsOnboarding ? (
        <Onboarding />
      ) : (
        <Shell>
          <div className="px-4 pt-4">
            <UpdateBanner />
          </div>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/:level" element={<Learn />} />
              <Route path="/lesson/:lessonId" element={<LessonPage />} />
              <Route path="/tests" element={<TestsPage />} />
              <Route path="/test/:testId" element={<TestSessionPage />} />
              <Route path="/drill" element={<DrillPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/teacher" element={<TeacherPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Shell>
      )}
    </>
  );
}
