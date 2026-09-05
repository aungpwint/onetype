/**
 * Typed error taxonomy for the lesson platform.
 *
 * Consumers catch specific failure modes (missing lesson, malformed content,
 * unsupported schema version) without string-matching messages.
 */

export abstract class LessonError extends Error {
  readonly lessonId: string | null;

  constructor(message: string, lessonId?: string) {
    super(message);
    this.name = new.target.name;
    this.lessonId = lessonId ?? null;
  }
}

/** Raised when lesson JSON cannot be parsed (malformed JSON or unreadable file). */
export class LessonParseError extends LessonError {
  readonly source: string;

  constructor(message: string, source: string, lessonId?: string) {
    super(message, lessonId);
    this.source = source;
  }
}

/** Raised when a lesson exists but violates the canonical Lesson schema. */
export class LessonValidationError extends LessonError {
  readonly issues: string[];

  constructor(issues: string[], lessonId?: string) {
    super(`Lesson validation failed${lessonId ? ` for "${lessonId}"` : ""}: ${issues.join("; ")}`, lessonId);
    this.issues = issues;
  }
}

/** Raised when a lesson's schemaVersion is newer than this loader understands. */
export class UnsupportedLessonSchemaError extends LessonError {
  readonly schemaVersion: number;

  constructor(schemaVersion: number, lessonId?: string) {
    super(`Unsupported lesson schema version ${schemaVersion}${lessonId ? ` for "${lessonId}"` : ""}`, lessonId);
    this.schemaVersion = schemaVersion;
  }
}

/** Raised when an exercise references an unknown kind. */
export class UnsupportedExerciseTypeError extends LessonError {
  readonly kind: string;

  constructor(kind: string, lessonId?: string) {
    super(`Unsupported exercise kind "${kind}"${lessonId ? ` in lesson "${lessonId}"` : ""}`, lessonId);
    this.kind = kind;
  }
}

/** Raised when a requested lesson id does not exist in the repository. */
export class LessonNotFoundError extends LessonError {
  constructor(id: string) {
    super(`Unknown lesson: "${id}"`, id);
  }
}

/** Raised when the lesson catalog itself is incoherent (duplicates, drift). */
export class LessonCatalogError extends LessonError {
  readonly issues: string[];

  constructor(issues: string[], lessonId?: string) {
    super(`Invalid lesson catalog: ${issues.join("; ")}`, lessonId);
    this.issues = issues;
  }
}