const COMBINING_MARK = /\p{Mark}/u;

export function isCombiningMark(ch: string): boolean {
  return COMBINING_MARK.test(ch);
}

function splitIntoCodePoints(text: string): string[] {
  return Array.from(text);
}

interface SegmenterInstance {
  segment(text: string): IterableIterator<{ segment: string }>;
}

type SegmenterConstructor = new (locale?: string, options?: { granularity?: string }) => SegmenterInstance;

const segmenterCtor = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;

export function splitGraphemes(text: string): string[] {
  if (typeof segmenterCtor === "function") {
    const segmenter = new segmenterCtor(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (seg) => seg.segment);
  }
  const result: string[] = [];
  let current = "";
  for (const ch of splitIntoCodePoints(text)) {
    if (current.length > 0 && isCombiningMark(ch)) {
      current += ch;
      continue;
    }
    if (current.length > 0) {
      result.push(current);
    }
    current = ch;
  }
  if (current.length > 0) result.push(current);
  return result;
}

export function graphemeCount(text: string): number {
  if (text.length === 0) return 0;
  return splitGraphemes(text).length;
}