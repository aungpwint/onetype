/**
 * Exercise domain model.
 *
 * Lesson content is expressed as a discriminated union of exercise types.
 * Each exercise carries declarative *content* plus lightweight behavioural
 * options. Nothing here references React, the DOM, or any presentation detail.
 *
 * The set of kinds is open for extension: adding a future kind means adding a
 * member here, a serializer entry in the normalizer, and (if the runtime needs
 * to *play* it) an exercise strategy. The typing engine itself remains generic
 * over typed text.
 */
export type LessonExercise =
  | KeyExercise
  | WordExercise
  | SentenceExercise
  | TextExercise
  | ParagraphExercise
  | CustomExercise;

export interface ExerciseOptions {
  /** Allow Backspace to correct mistakes mid-exercise. Defaults to true. */
  allowBackspace?: boolean;
  /** Allow incorrect keystrokes without failing the exercise. Defaults to true. */
  allowMistakes?: boolean;
  /** Show the full target text while typing. Defaults to true. */
  showTarget?: boolean;
}

interface ExerciseBase {
  id: string;
  options?: ExerciseOptions;
  /** Optional per-exercise instruction shown to the learner. */
  instruction?: string;
}

/** Repeated single keystrokes (e.g. "f f f f f"). */
export interface KeyExercise extends ExerciseBase {
  kind: "keys";
  keys: string[];
  /** How many times each key is repeated. Defaults to 3. */
  repeats?: number;
}

/** A space-separated list of words to type. */
export interface WordExercise extends ExerciseBase {
  kind: "words";
  words: string[];
}

/** One or more sentences to type. */
export interface SentenceExercise extends ExerciseBase {
  kind: "sentences";
  sentences: string[];
}

/** A single passage of text to retype exactly. */
export interface TextExercise extends ExerciseBase {
  kind: "text";
  text: string;
}

/** A longer passage to retype (multiple sentences). */
export interface ParagraphExercise extends ExerciseBase {
  kind: "paragraph";
  text: string;
}

/** Arbitrary validated text content for future/experimental exercise kinds. */
export interface CustomExercise extends ExerciseBase {
  kind: "custom";
  text: string;
  /** Discriminates the custom sub-kind so strategies can be resolved. */
  subtype: string;
}

export const EXERCISE_KINDS = ["keys", "words", "sentences", "text", "paragraph", "custom"] as const;

export type LessonExerciseKind = (typeof EXERCISE_KINDS)[number];

export function isLessonExerciseKind(value: unknown): value is LessonExerciseKind {
  return typeof value === "string" && (EXERCISE_KINDS as readonly string[]).includes(value);
}

/**
 * Resolve the full target text for an exercise, exactly as a learner should
 * type it. This is the content contract the typing engine consumes.
 */
export function exerciseText(exercise: LessonExercise): string {
  switch (exercise.kind) {
    case "keys":
      return expandKeyExercise(exercise);
    case "words":
      return exercise.words.join(" ");
    case "sentences":
      return exercise.sentences.join(" ");
    case "text":
    case "paragraph":
    case "custom":
      return exercise.text;
  }
}

function expandKeyExercise(exercise: KeyExercise): string {
  const repeats = exercise.repeats ?? 3;
  const tokens: string[] = [];
  for (const key of exercise.keys) {
    for (let i = 0; i < repeats; i++) tokens.push(key);
  }
  return tokens.join(" ");
}

export interface NormalizedExercise {
  id: string;
  kind: LessonExerciseKind;
  /** The target text the learner types. */
  text: string;
  instruction?: string;
  options?: ExerciseOptions;
}