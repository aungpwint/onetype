import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { initUi, useUiStore } from "./stores/ui-store";
import { useStudentStore } from "./stores/student-store";
import { useSettingsStore } from "./stores/settings-store";
import { useStartupUpdateCheck } from "./services/updater/use-updater";
import { Shell } from "./components/AppShell";
import { UpdateBanner } from "./components/UpdateBanner";
import { UpdateDialog } from "./components/UpdateDialog";
import { Onboarding } from "./components/Onboarding";
import { Spinner } from "./components/ui";
import Dashboard from "./pages/Dashboard";
import Learn from "./pages/Learn";
import { LessonPage, TestPage as TestSessionPage } from "./pages/SessionPage";
import TestsPage from "./pages/TestsPage";
import ProgressPage from "./pages/ProgressPage";
import StudentsPage from "./pages/StudentsPage";
import TeacherPage from "./pages/TeacherPage";
import SettingsPage from "./pages/SettingsPage";

function Boot() {
  useStartupUpdateCheck();
  useEffect(() => {
    initUi();
    void useUiStore.getState().setTheme(useUiStore.getState().theme);
    void useSettingsStore.getState().load();
    void useStudentStore.getState().load();
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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:level" element={<Learn />} />
            <Route path="/lesson/:lessonId" element={<LessonPage />} />
            <Route path="/tests" element={<TestsPage />} />
            <Route path="/test/:testId" element={<TestSessionPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/teacher" element={<TeacherPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      )}
    </>
  );
}