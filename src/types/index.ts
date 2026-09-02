export type Level = "beginner" | "intermediate" | "advanced";

export type Language = "english" | "myanmar" | "mixed";

export type Modifier = "none" | "shift";

export type Hand = "left" | "right";

export type FingerId =
  | "left-pinky"
  | "left-ring"
  | "left-middle"
  | "left-index"
  | "left-thumb"
  | "right-thumb"
  | "right-index"
  | "right-middle"
  | "right-ring"
  | "right-pinky";

export type FingerState = "idle" | "active" | "correct" | "incorrect" | "disabled";

export type ExerciseType =
  | "character"
  | "random-characters"
  | "syllable"
  | "word"
  | "sentence"
  | "paragraph"
  | "mixed"
  | "timed-test"
  | "exam";

export type TypingMode = "guided" | "practice" | "strict" | "test";

export type ThemePreference = "light" | "dark" | "system";

export type Difficulty = "basic" | "easy" | "medium" | "hard";

export const LEVEL_ORDER: Level[] = ["beginner", "intermediate", "advanced"];

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVEL_ORDER as string[]).includes(value);
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && ["english", "myanmar", "mixed"].includes(value);
}

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const LEVEL_LABELS_MY: Record<Level, string> = {
  beginner: "အခြေခံ",
  intermediate: "အလယ်အလတ်",
  advanced: "အဆင့်မြင့်",
};