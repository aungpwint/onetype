export type ChunkStyle = 'repetition' | 'alternation' | 'runs' | 'variable' | 'transition' | 'controlled'

export interface ChunkSpec {
    type: 'chunks'
    keys: string[]
    count: number
    chunkMin: number
    chunkMax: number
    style?: ChunkStyle
    mixed?: boolean
    seed?: number
}

export interface WordListSpec {
    type: 'words'
    bank?: string
    words?: string[]
    count: number
    maxWordLength?: number
    keys?: string[]
    seed?: number
}

export interface SentenceListSpec {
    type: 'sentences'
    bank?: string
    sentences?: string[]
    count: number
    seed?: number
}

export type ExerciseGeneratorSpec = ChunkSpec | WordListSpec | SentenceListSpec

export function isChunkSpec(spec: ExerciseGeneratorSpec): spec is ChunkSpec {
    return spec.type === 'chunks'
}

export function isWordListSpec(spec: ExerciseGeneratorSpec): spec is WordListSpec {
    return spec.type === 'words'
}

export function isSentenceListSpec(spec: ExerciseGeneratorSpec): spec is SentenceListSpec {
    return spec.type === 'sentences'
}

export interface GenerationContext {
    lessonId: string
    exerciseId: string
    seed?: number
}

// A single human-typed input unit for pattern drills. For English this is a
// Latin character; for Myanmar it is a complete syllable/grapheme cluster that
// may require several keystrokes. Tokens are composed from these units, so a
// space always separates meaningfully complete chunks rather than interrupting
// a multi-keystroke Myanmar cluster.
export interface DrilledUnit {
    text: string
    finger: string
    hand: 'left' | 'right'
}

export interface ChunkGenerationOptions {
    keys: string[]
    tokenCount: number
    chunkMin: number
    chunkMax: number
    style: ChunkStyle
    mixed: boolean
    maxConsecutive: number
    avoidIdenticalAdjacent: boolean
}

export interface ChunkGenerationResult {
    tokens: string[]
    units: DrilledUnit[]
}

export interface DifficultyDimensions {
    uniqueKeys: number
    characterCount: number
    shiftRatio: number
    sameHandRatio: number
    sameFingerRatio: number
    rowChangeRatio: number
    meanChunkLength: number
    graphemeComplexity: number
    entropy: number
}

export interface DifficultyProfile {
    score: number
    dimensions: DifficultyDimensions
}

export interface LessonQualityFactors {
    repetitionScore: number
    varietyScore: number
    spacingScore: number
    fingerBalanceScore: number
    handBalanceScore: number
    transitionScore: number
    difficultyScore: number
    targetCoverageScore: number
}

export interface LessonQuality {
    score: number
    factors: LessonQualityFactors
    issues: string[]
}

export interface LanguageDefinition {
    id: 'english' | 'myanmar' | 'mixed'
    layoutId: string
    maxChunkLength: number
    banks: Record<string, string[]>
    splitUnits(text: string): string[]
    joinChunks(chunks: string[]): string
}

export interface FingerKeyTable {
    leftPinky: string[]
    leftRing: string[]
    leftMiddle: string[]
    leftIndex: string[]
    rightIndex: string[]
    rightMiddle: string[]
    rightRing: string[]
    rightPinky: string[]
}

export const ALL_FINGER_KEY_LISTS: (keyof FingerKeyTable)[] = [
    'leftPinky',
    'leftRing',
    'leftMiddle',
    'leftIndex',
    'rightIndex',
    'rightMiddle',
    'rightRing',
    'rightPinky',
]

export const QUALITY_THRESHOLD_PASS = 65
export const QUALITY_THRESHOLD_SOFT = 50