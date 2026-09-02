export const MYANMAR_BASE_MIN = 0x1000;
export const MYANMAR_BASE_MAX = 0x109f;

export function isMyanmarCodePoint(code: number): boolean {
  return code >= MYANMAR_BASE_MIN && code <= MYANMAR_BASE_MAX;
}

export function containsMyanmar(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (isMyanmarCodePoint(code)) return true;
  }
  return false;
}

export function detectLanguage(text: string): "myanmar" | "english" {
  return containsMyanmar(text) ? "myanmar" : "english";
}

export function toUnicodeLabels(text: string): string[] {
  return Array.from(text).map((ch) => `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`);
}

export function charNames(text: string): string[] {
  return Array.from(text).map((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    return `U+${cp.toString(16).padStart(4, "0")}`;
  });
}