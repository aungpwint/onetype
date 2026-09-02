import type { Level } from "../../types";
import { getLayoutOrThrow } from "../../core/keyboard-layout/registry";
import { splitGraphemes } from "../../core/unicode/graphemes";
import { buildSequence, BuiltSequence } from "../../core/typing-engine/sequence";
import type { LessonData, LessonPhase } from "./types";

export interface ResolvedPhase {
  label: string;
  instruction: string;
  startUnit: number;
  endUnit: number;
  text: string;
}

export interface ResolvedLesson {
  id: string;
  level: Level;
  number: number;
  sequence: BuiltSequence;
  layoutId: string;
  totalUnits: number;
  totalCharacters: number;
  phases: ResolvedPhase[];
  difficulty: string;
  estimatedMinutes: number;
  completion: { minAccuracy: number; minWpm: number | null };
  title: string;
  titleMy: string;
  description: string;
  language: string;
  focusKeys?: string[];
}

export interface LessonBuildError {
  lessonId: string;
  message: string;
}

export function validateLessonCharacters(lessonId: string, phase: LessonPhase, layoutId: string): void {
  const layout = getLayoutOrThrow(layoutId);
  for (const grapheme of splitGraphemes(phase.text)) {
    for (const ch of grapheme) {
      if (!layout.lookupChar(ch)) {
        throw new Error(
          `Lesson "${lessonId}": layout "${layoutId}" has no key for character U+${(
            ch.codePointAt(0) ?? 0
          ).toString(16).toUpperCase().padStart(4, "0")} (in phase "${phase.instruction}")`,
        );
      }
    }
  }
}

export function resolveLesson(data: LessonData): ResolvedLesson {
  for (const phase of data.phases) {
    validateLessonCharacters(data.id, phase, data.layoutId);
  }

  const allPhases: ResolvedPhase[] = [];
  const unitsByPhase: BuiltSequence[] = [];
  let unitOffset = 0;
  let phaseIndex = 0;
  for (const phase of data.phases) {
    const sequence = buildSequence(phase.text, getLayoutOrThrow(data.layoutId));
    allPhases.push({
      label: `${data.number}.${phaseIndex + 1}`,
      instruction: phase.instruction,
      startUnit: unitOffset,
      endUnit: unitOffset + sequence.units.length,
      text: phase.text,
    });
    unitsByPhase.push(sequence);
    unitOffset += sequence.units.length;
    phaseIndex += 1;
  }

  let totalCharacters = 0;
  const allUnits = unitsByPhase.flatMap((sequence) => {
    totalCharacters += sequence.units.length;
    return sequence.units;
  });
  for (let i = 0; i < allUnits.length; i++) {
    allUnits[i].index = i;
  }

  const concatTexts = allPhases.map((phase) => phase.text);
  const graphemes = concatTexts.flatMap((text) => splitGraphemes(text));

  const sequence: BuiltSequence = {
    units: allUnits,
    graphemes,
    graphemeUnitRanges: allPhases.map((phase) => [phase.startUnit, phase.endUnit]),
    text: concatTexts.join(" "),
    charCount: totalCharacters,
  };

  return {
    ...data,
    sequence,
    totalUnits: allUnits.length,
    totalCharacters,
    phases: allPhases,
  };
}

export function levelLessonIds(language: "en" | "my", level: Level, count: number): string[] {
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    ids.push(`lesson-${language}-${level}-${i}`);
  }
  return ids;
}

export function nextLessonId(language: "en" | "my", level: Level, number: number): string {
  return `lesson-${language}-${level}-${number + 1}`;
}

export function isLessonComplete(lesson: ResolvedLesson): boolean {
  return lesson.sequence.units.length > 0;
}

export function lessonCharCount(lesson: LessonData): number {
  return lesson.phases.reduce((sum, phase) => sum + splitGraphemes(phase.text).length, 0);
}