import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTypingStore } from "../stores/typing-store";

/**
 * Global keyboard shortcuts for navigation and common actions.
 * Typing-mode keys are handled by the typing engine itself, so these shortcuts
 * avoid intercepting single letters while a session is active.
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const typingActive = useTypingStore.getState().status !== "idle";
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey || event.altKey;

      // Navigation quickly via Ctrl/Cmd + number
      if (mod && event.key === "1") {
        event.preventDefault();
        navigate("/");
        return;
      }
      if (mod && event.key === "2") {
        event.preventDefault();
        navigate("/learn");
        return;
      }
      if (mod && event.key === "3") {
        event.preventDefault();
        navigate("/tests");
        return;
      }
      if (mod && event.key === "4") {
        event.preventDefault();
        navigate("/progress");
        return;
      }
      if (mod && event.key === "5") {
        event.preventDefault();
        navigate("/settings");
        return;
      }
      // Ctrl+Shift+M or Ctrl+, → settings
      if ((mod && key === ",") || (mod && event.shiftKey && key === "m")) {
        event.preventDefault();
        navigate("/settings");
        return;
      }
      // Ctrl+Shift+T → timed tests
      if (mod && event.shiftKey && key === "t") {
        event.preventDefault();
        navigate("/tests");
        return;
      }
      // Ctrl+Shift+L → learn
      if (mod && event.shiftKey && key === "l") {
        event.preventDefault();
        navigate("/learn");
        return;
      }

      // Session shortcuts (never trigger on plain typing, only with modifiers handled above
      // or dedicated keys that typing already routes): Escape pauses a running session.
      if (!mod && key === "escape" && typingActive) {
        const st = useTypingStore.getState();
        if (st.status === "running" || st.status === "paused") st.togglePause();
        return;
      }
      // R while paused or ready restarts current session
      if (!mod && key === "r" && typingActive) {
        const st = useTypingStore.getState();
        if (st.status === "ready" || st.status === "paused") {
          const { session } = st;
          if (!session) return;
          st.abandon();
          if (session.kind === "lesson" && session.lessonId) void useTypingStore.getState().beginLesson(session.lessonId, session.mode);
          else if (session.kind === "test" && session.test) void useTypingStore.getState().beginTest(session.test);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);
}
