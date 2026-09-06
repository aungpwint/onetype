import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useUiStore } from '@/stores/ui-store'
import { useStudentStore } from '@/stores/student-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useStartupUpdateCheck } from '@/services/updater/use-updater'
import { notificationService } from '@/services/notification/service'
import { Shell } from '@/components/app-shell'
import { PageTransition } from '@/components/page-transition'
import { SessionFocus } from '@/components/session/session-focus'
import { UpdateBanner } from '@/components/update-banner'
import { UpdateDialog } from '@/components/update-dialog'
import { Onboarding } from '@/components/onboarding'
import { Spinner } from '@/components/ui'

const Dashboard = lazy(() => import('@/pages/dashboard'))
const Learn = lazy(() => import('@/pages/learn'))
const TestsPage = lazy(() => import('@/pages/tests-page'))
const ProgressPage = lazy(() => import('@/pages/progress-page'))
const StudentsPage = lazy(() => import('@/pages/students-page'))
const TeacherPage = lazy(() => import('@/pages/teacher-page'))
const SettingsPage = lazy(() => import('@/pages/settings-page'))

const LessonPage = lazy(() => import('@/pages/lesson-page'))
const TestSessionPage = lazy(() => import('@/pages/test-page'))
const DrillPage = lazy(() => import('@/pages/drill-page'))
const PracticePage = lazy(() => import('@/pages/practice-page'))

function PageLoader() {
    return <Spinner label="Loading…" />
}

function AppView({ children }: { children: ReactNode }) {
    const contentRef = useRef<HTMLElement>(null)
    return (
        <Shell contentRef={contentRef}>
            <div className="px-4 pt-4">
                <UpdateBanner />
            </div>
            <PageTransition scrollRef={contentRef}>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {children}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </PageTransition>
        </Shell>
    )
}

function SessionRoutes() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route
                    path="/lesson/:lessonId"
                    element={
                        <SessionFocus>
                            <LessonPage />
                        </SessionFocus>
                    }
                />
                <Route
                    path="/test/:testId"
                    element={
                        <SessionFocus>
                            <TestSessionPage />
                        </SessionFocus>
                    }
                />
                <Route
                    path="/drill"
                    element={
                        <SessionFocus>
                            <DrillPage />
                        </SessionFocus>
                    }
                />
                <Route
                    path="/practice"
                    element={
                        <SessionFocus>
                            <PracticePage />
                        </SessionFocus>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    )
}

function Boot() {
    useStartupUpdateCheck()
    useEffect(() => {
        void useUiStore.getState().setTheme(useUiStore.getState().theme)
        void useSettingsStore.getState().load()
        void useStudentStore.getState().load()
        void notificationService.init()
    }, [])
    return null
}

export default function App() {
    const loaded = useStudentStore((s) => s.loaded)
    const loading = useStudentStore((s) => s.loading)
    const students = useStudentStore((s) => s.students)
    const location = useLocation()

    const needsOnboarding = students.length === 0 || location.pathname === '/onboarding'

    const inSessionRoute = /^\/(lesson\/|test\/|drill|practice)/.test(location.pathname)

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
            ) : inSessionRoute ? (
                <SessionRoutes />
            ) : (
                <AppView>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/learn" element={<Learn />} />
                    <Route path="/learn/:level" element={<Learn />} />
                    <Route path="/tests" element={<TestsPage />} />
                    <Route path="/progress" element={<ProgressPage />} />
                    <Route path="/students" element={<StudentsPage />} />
                    <Route path="/teacher" element={<TeacherPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </AppView>
            )}
        </>
    )
}
