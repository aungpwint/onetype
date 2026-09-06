export abstract class LessonError extends Error {
    readonly lessonId: string | null

    constructor(message: string, lessonId?: string) {
        super(message)
        this.name = new.target.name
        this.lessonId = lessonId ?? null
    }
}

export class LessonParseError extends LessonError {
    readonly source: string

    constructor(message: string, source: string, lessonId?: string) {
        super(message, lessonId)
        this.source = source
    }
}

export class LessonValidationError extends LessonError {
    readonly issues: string[]

    constructor(issues: string[], lessonId?: string) {
        super(`Lesson validation failed${lessonId ? ` for "${lessonId}"` : ''}: ${issues.join('; ')}`, lessonId)
        this.issues = issues
    }
}

export class UnsupportedLessonSchemaError extends LessonError {
    readonly schemaVersion: number

    constructor(schemaVersion: number, lessonId?: string) {
        super(`Unsupported lesson schema version ${schemaVersion}${lessonId ? ` for "${lessonId}"` : ''}`, lessonId)
        this.schemaVersion = schemaVersion
    }
}

export class UnsupportedExerciseTypeError extends LessonError {
    readonly kind: string

    constructor(kind: string, lessonId?: string) {
        super(`Unsupported exercise kind "${kind}"${lessonId ? ` in lesson "${lessonId}"` : ''}`, lessonId)
        this.kind = kind
    }
}

export class LessonNotFoundError extends LessonError {
    constructor(id: string) {
        super(`Unknown lesson: "${id}"`, id)
    }
}

export class LessonCatalogError extends LessonError {
    readonly issues: string[]

    constructor(issues: string[], lessonId?: string) {
        super(`Invalid lesson catalog: ${issues.join('; ')}`, lessonId)
        this.issues = issues
    }
}
