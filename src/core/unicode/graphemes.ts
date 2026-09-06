const COMBINING_MARK = /\p{Mark}/u

function isCombiningMark(ch: string): boolean {
    return COMBINING_MARK.test(ch)
}

interface SegmenterInstance {
    segment(text: string): IterableIterator<{ segment: string }>
}

type SegmenterConstructor = new (locale?: string, options?: { granularity?: string }) => SegmenterInstance

const segmenterCtor = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter

let segmenter: SegmenterInstance | null = null

export function splitGraphemes(text: string): string[] {
    if (typeof segmenterCtor === 'function') {
        if (!segmenter) segmenter = new segmenterCtor(undefined, { granularity: 'grapheme' })
        return Array.from(segmenter.segment(text), (seg) => seg.segment)
    }
    // Fallback without Intl.Segmenter: collect combining marks onto their base.
    const result: string[] = []
    let current = ''
    for (const ch of text) {
        if (current.length > 0 && isCombiningMark(ch)) {
            current += ch
            continue
        }
        if (current.length > 0) {
            result.push(current)
        }
        current = ch
    }
    if (current.length > 0) result.push(current)
    return result
}
