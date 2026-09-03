import type { Difficulty, FingerId, Hand, Language, LessonFocus, Level } from "../../types";

export interface LessonCompletionRule {
  minAccuracy: number;
  minWpm: number | null;
}

export interface LessonPhase {
  instruction: string;
  text: string;
}

export type LessonItem =
  | { kind: "keys"; instruction: string; keys: string[]; repeats?: number }
  | { kind: "text"; instruction: string; text: string }
  | { kind: "words"; instruction: string; words: string[] }
  | { kind: "sentences"; instruction: string; sentences: string[] }
  | { kind: "paragraph"; instruction: string; text: string };

export interface LessonData {
  id: string;
  level: Level;
  number: number;
  title: string;
  titleMy: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  language: Language;
  layoutId: "english-qwerty" | "myanmar3";
  completion: LessonCompletionRule;
  focusKeys?: string[];
  focus?: LessonFocus[];
  targetFingers?: FingerId[];
  targetHands?: Hand[];
  requiresShift?: boolean;
  prerequisites?: string[];
  phases: LessonPhase[];
}

export function toPhases(items: LessonItem[]): LessonPhase[] {
  const phases: LessonPhase[] = [];
  for (const item of items) {
    if (item.kind === "keys") {
      const repeats = item.repeats ?? 3;
      const keyTexts: string[] = [];
      for (const key of item.keys) {
        for (let i = 0; i < repeats; i++) keyTexts.push(key);
      }
      phases.push({ instruction: item.instruction, text: keyTexts.join(" ") });
    } else if (item.kind === "words") {
      phases.push({ instruction: item.instruction, text: item.words.join(" ") });
    } else if (item.kind === "sentences") {
      phases.push({ instruction: item.instruction, text: item.sentences.join(" ") });
    } else {
      phases.push({ instruction: item.instruction, text: item.text });
    }
  }
  return phases;
}