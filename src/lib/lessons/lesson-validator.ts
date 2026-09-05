import type { ExerciseOptions, LessonExercise, LessonExerciseKind } from "../../types/exercise";
import { isLessonExerciseKind } from "../../types/exercise";
import type { Lesson, LessonCompletionRule, LessonMetadata } from "../../types/lesson";
import type { LessonLanguage } from "../../types/language";
import { isLessonLanguage } from "../../types/language";
import type { KeyboardId } from "../../types/keyboard";
import { isKeyboardId } from "../../types/keyboard";
import { LESSON_SCHEMA_VERSION } from "../../types/lesson";
import { isLevel } from "../../types";
import { isLessonDifficulty, isHand, isFingerId, isLessonFocus } from "../../types/common";
import {
  LessonValidationError,
  LessonParseError,
  UnsupportedExerciseTypeError,
  UnsupportedLessonSchemaError,
} from "./lesson-errors";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertIssues(issues: string[], lessonId?: string): void {
  if (issues.length > 0) throw new LessonValidationError(issues, lessonId);
}

function validateExerciseOptions(value: unknown, issues: string[], path: string): ExerciseOptions | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }
  const options: ExerciseOptions = {};
  if (value.allowBackspace !== undefined && typeof value.allowBackspace !== "boolean") {
    issues.push(`${path}.allowBackspace must be a boolean`);
  } else if (value.allowBackspace !== undefined) {
    options.allowBackspace = value.allowBackspace;
  }
  if (value.allowMistakes !== undefined && typeof value.allowMistakes !== "boolean") {
    issues.push(`${path}.allowMistakes must be a boolean`);
  } else if (value.allowMistakes !== undefined) {
    options.allowMistakes = value.allowMistakes;
  }
  if (value.showTarget !== undefined && typeof value.showTarget !== "boolean") {
    issues.push(`${path}.showTarget must be a boolean`);
  } else if (value.showTarget !== undefined) {
    options.showTarget = value.showTarget;
  }
  return options;
}

function validateExerciseId(value: unknown, issues: string[], path: string): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path}.id must be a non-empty string`);
    return undefined;
  }
  return value;
}

function stringArray(value: unknown, issues: string[], path: string): string[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    issues.push(`${path} must be a string[]`);
    return undefined;
  }
  return value;
}

function validateInstruction(value: unknown, issues: string[], path: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    issues.push(`${path}.instruction must be a string`);
    return undefined;
  }
  return value;
}

function validateExercise(value: unknown, issues: string[], lessonId?: string): LessonExercise | undefined {
  if (!isRecord(value)) {
    issues.push("exercises[*] must be an object");
    return undefined;
  }
  if (value.id === undefined) {
    // Missing id is tolerated: the normalizer derives a stable one.
  }
  const path = "exercises[*]";

  const id = validateExerciseId(value.id ?? `${lessonId ?? "lesson"}-exercise`, issues, path);

  const kind = value.kind;
  if (typeof kind !== "string" || !isLessonExerciseKind(kind)) {
    throw new UnsupportedExerciseTypeError(typeof kind === "string" ? kind : "<missing>", lessonId);
  }
  const instruction = validateInstruction(value.instruction, issues, path);
  const options = validateExerciseOptions(value.options, issues, `${path}.options`);

  const exerciseKind: LessonExerciseKind = kind;
  switch (exerciseKind) {
    case "keys": {
      const keys = stringArray(value.keys, issues, `${path}.keys`);
      if (keys !== undefined && keys.length === 0) issues.push(`${path}.keys must not be empty`);
      const repeats = value.repeats;
      if (repeats !== undefined && (typeof repeats !== "number" || !Number.isInteger(repeats) || repeats < 1)) {
        issues.push(`${path}.repeats must be a positive integer`);
      }
      if (keys === undefined) return undefined;
      return { kind: "keys", id: id ?? "", keys, repeats: typeof repeats === "number" ? repeats : undefined, instruction, options };
    }
    case "words": {
      const words = stringArray(value.words, issues, `${path}.words`);
      if (words === undefined) return undefined;
      return { kind: "words", id: id ?? "", words, instruction, options };
    }
    case "sentences": {
      const sentences = stringArray(value.sentences, issues, `${path}.sentences`);
      if (sentences === undefined) return undefined;
      return { kind: "sentences", id: id ?? "", sentences, instruction, options };
    }
    case "text":
    case "paragraph": {
      if (typeof value.text !== "string" || value.text.trim().length === 0) {
        issues.push(`${path}.text must be a non-empty string for kind "${exerciseKind}"`);
        return undefined;
      }
      return { kind: exerciseKind, id: id ?? "", text: value.text, instruction, options };
    }
    case "custom": {
      if (typeof value.text !== "string" || value.text.trim().length === 0) {
        issues.push(`${path}.text must be a non-empty string for kind "custom"`);
        return undefined;
      }
      if (typeof value.subtype !== "string" || value.subtype.trim().length === 0) {
        issues.push(`${path}.subtype must be a non-empty string for kind "custom"`);
        return undefined;
      }
      return {
        kind: "custom",
        id: id ?? "",
        text: value.text,
        subtype: value.subtype,
        instruction,
        options,
      };
    }
  }
}

function validateMetadata(value: unknown, issues: string[], path: string): LessonMetadata | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }
  const metadata: LessonMetadata = {};
  for (const key of ["author", "version"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "string") issues.push(`${path}.${key} must be a string`);
    else if (value[key] !== undefined) metadata[key] = value[key];
  }
  if (value.tags !== undefined) {
    const tags = stringArray(value.tags, issues, `${path}.tags`);
    if (tags !== undefined) metadata.tags = tags;
  }
  if (value.estimatedDuration !== undefined) {
    if (typeof value.estimatedDuration !== "number" || value.estimatedDuration < 0) {
      issues.push(`${path}.estimatedDuration must be a non-negative number`);
    } else {
      metadata.estimatedDuration = value.estimatedDuration;
    }
  }
  if (value.createdAt !== undefined && typeof value.createdAt !== "string") issues.push(`${path}.createdAt must be a string`);
  else if (value.createdAt !== undefined) metadata.createdAt = value.createdAt;
  if (value.updatedAt !== undefined && typeof value.updatedAt !== "string") issues.push(`${path}.updatedAt must be a string`);
  else if (value.updatedAt !== undefined) metadata.updatedAt = value.updatedAt;
  return metadata;
}

function validateCompletion(value: unknown, issues: string[], path: string): LessonCompletionRule | undefined {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }
  const { minAccuracy, minWpm } = value;
  if (typeof minAccuracy !== "number" || minAccuracy < 0 || minAccuracy > 100) {
    issues.push(`${path}.minAccuracy must be a number between 0 and 100`);
    return undefined;
  }
  if (minWpm !== null && (typeof minWpm !== "number" || minWpm < 0)) {
    issues.push(`${path}.minWpm must be a non-negative number or null`);
    return undefined;
  }
  const completion: LessonCompletionRule = { minAccuracy, minWpm: minWpm === null ? null : (minWpm as number) };
  return completion;
}

/**
 * Validate an arbitrary parsed-JSON value as a canonical Lesson.
 *
 * Throws `UnsupportedLessonSchemaError`, `UnsupportedExerciseTypeError` or
 * `LessonValidationError` on failure. Returns a fully typed `Lesson` on success.
 */
export function validateLesson(value: unknown, _source?: string): Lesson {
  if (!isRecord(value)) {
    throw new LessonValidationError(["lesson root must be an object"], undefined);
  }
  const issues: string[] = [];

  const schemaVersion = value.schemaVersion;
  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    issues.push("schemaVersion must be a positive integer");
  } else if (schemaVersion > LESSON_SCHEMA_VERSION) {
    throw new UnsupportedLessonSchemaError(schemaVersion, typeof value.id === "string" ? value.id : undefined);
  }

  const id = value.id;
  if (typeof id !== "string" || !/^[a-z0-9.-]+$/.test(id)) {
    issues.push('id must be a non-empty string matching /^[a-z0-9.-]+$/');
  }

  if (!isLevel(value.level)) issues.push(`level must be one of "beginner", "intermediate", "advanced"`);
  const language = value.language;
  if (!isLessonLanguage(language)) issues.push('language must be "en" or "my"');
  if (!isKeyboardId(value.keyboard)) issues.push('keyboard must be "qwerty" or "myanmar3"');
  if (!isLessonDifficulty(value.difficulty)) issues.push('difficulty must be one of "basic", "easy", "medium", "hard"');

  const number = value.number;
  if (typeof number !== "number" || !Number.isInteger(number) || number < 1) issues.push("number must be a positive integer");

  if (typeof value.title !== "string" || value.title.trim().length === 0) issues.push("title must be a non-empty string");
  if (value.titleMy !== undefined && typeof value.titleMy !== "string") issues.push("titleMy must be a string");
  if (typeof value.description !== "string" || value.description.trim().length === 0) issues.push("description must be a non-empty string");
  if (typeof value.estimatedMinutes !== "number" || value.estimatedMinutes < 0) issues.push("estimatedMinutes must be a non-negative number");

  const completion = validateCompletion(value.completion, issues, "completion");

  if (value.focusKeys !== undefined) {
    const keys = stringArray(value.focusKeys, issues, "focusKeys");
    if (keys !== undefined && keys.length === 0) issues.push("focusKeys must not be empty");
  }
  if (value.focus !== undefined) {
    if (!Array.isArray(value.focus) || !value.focus.every(isLessonFocus)) issues.push("focus must be an array of known lesson focus values");
  }
  if (value.targetFingers !== undefined) {
    if (!Array.isArray(value.targetFingers) || !value.targetFingers.every(isFingerId)) issues.push("targetFingers contains an unknown finger id");
  }
  if (value.targetHands !== undefined) {
    if (!Array.isArray(value.targetHands) || !value.targetHands.every(isHand)) issues.push('targetHands must only contain "left" or "right"');
  }
  if (value.requiresShift !== undefined && typeof value.requiresShift !== "boolean") issues.push("requiresShift must be a boolean");
  if (value.prerequisites !== undefined) stringArray(value.prerequisites, issues, "prerequisites");

  if (!Array.isArray(value.exercises) || value.exercises.length === 0) {
    issues.push("exercises must be a non-empty array");
  }

  const metadata = validateMetadata(value.metadata, issues, "metadata");

  assertIssues(issues, typeof id === "string" ? id : undefined);

  const lessonId = typeof id === "string" ? id : undefined;

  const exercises: LessonExercise[] = [];
  for (const raw of value.exercises as unknown[]) {
    const exercise = validateExercise(raw, issues, lessonId);
    if (exercise !== undefined) exercises.push(exercise);
    if (exercise === undefined && issues.length === 0) issues.push("exercises[*] could not be parsed");
  }

  if (exercises.length === 0) issues.push("exercises must resolve to at least one exercise");

  assertIssues(issues, lessonId);

  const result: Lesson = {
    schemaVersion: typeof schemaVersion === "number" ? schemaVersion : LESSON_SCHEMA_VERSION,
    id: lessonId!,
    level: value.level as Lesson["level"],
    language: language as LessonLanguage,
    number: number as number,
    title: typeof value.title === "string" ? value.title : "",
    description: typeof value.description === "string" ? value.description : "",
    difficulty: value.difficulty as Lesson["difficulty"],
    estimatedMinutes: typeof value.estimatedMinutes === "number" ? value.estimatedMinutes : 0,
    keyboard: value.keyboard as KeyboardId,
    completion: completion!,
    exercises,
    metadata,
  };
  if (typeof value.titleMy === "string") result.titleMy = value.titleMy;
  if (Array.isArray(value.focusKeys) && value.focusKeys.every((k) => typeof k === "string") && value.focusKeys.length > 0) {
    result.focusKeys = value.focusKeys as string[];
  }
  if (Array.isArray(value.focus)) result.focus = value.focus as Lesson["focus"];
  if (Array.isArray(value.targetFingers)) result.targetFingers = value.targetFingers as Lesson["targetFingers"];
  if (Array.isArray(value.targetHands)) result.targetHands = value.targetHands as Lesson["targetHands"];
  if (typeof value.requiresShift === "boolean") result.requiresShift = value.requiresShift;
  if (Array.isArray(value.prerequisites)) result.prerequisites = value.prerequisites as string[];
  return result;
}

export interface LessonSchemaValidation {
  type: "lesson-schema";
  schemaVersion: number;
}

export function lessonSchemaInfo(value: unknown): LessonSchemaValidation | null {
  if (!isRecord(value)) return null;
  return {
    type: "lesson-schema",
    schemaVersion: typeof value.schemaVersion === "number" ? value.schemaVersion : LESSON_SCHEMA_VERSION,
  };
}

/** Parse + validate a JSON string into a typed Lesson. */
export function parseLesson(json: string, source: string): Lesson {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (error) {
    throw new LessonParseError(`Could not parse JSON from "${source}": ${(error as Error).message}`, source);
  }
  return validateLesson(raw, source);
}