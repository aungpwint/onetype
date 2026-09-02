export interface ScoreMetrics {
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  accuracy: number;
  characters: number;
  words: number;
  grossWpm: number;
  netWpm: number;
  cpm: number;
  elapsedSeconds: number;
  backspaceCount: number;
}

export const WORD_LENGTH = 5;

export function computeScore(input: {
  correctAttempts: number;
  incorrectAttempts: number;
  backspaceCount: number;
  elapsedSeconds: number;
}): ScoreMetrics {
  const totalAttempts = input.correctAttempts + input.incorrectAttempts;
  const accuracy = totalAttempts > 0 ? (input.correctAttempts / totalAttempts) * 100 : 0;
  const minutes = input.elapsedSeconds / 60;
  const characters = input.correctAttempts;
  const words = characters / WORD_LENGTH;
  const grossWpm = minutes > 0 ? words / minutes : 0;
  const netWords = Math.max(0, characters - input.incorrectAttempts) / WORD_LENGTH;
  const netWpm = minutes > 0 ? netWords / minutes : 0;
  const cpm = minutes > 0 ? characters / minutes : 0;
  return {
    totalAttempts,
    correctAttempts: characters,
    incorrectAttempts: input.incorrectAttempts,
    accuracy,
    characters,
    words,
    grossWpm,
    netWpm,
    cpm,
    elapsedSeconds: input.elapsedSeconds,
    backspaceCount: input.backspaceCount,
  };
}

export function isPassed(metrics: ScoreMetrics, minAccuracy: number, minWpm: number | null): boolean {
  if (metrics.accuracy < minAccuracy) return false;
  if (minWpm !== null && metrics.grossWpm < minWpm) return false;
  return true;
}