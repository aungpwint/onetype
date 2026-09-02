import type { Modifier } from "../../types";
import type { Hand } from "../../types";
import type { FingerId } from "../../types";
import { KeyboardLayout } from "../keyboard-layout/layout";
import { splitGraphemes } from "../unicode/graphemes";
import { handForFinger } from "../finger-mapping/finger-map";

export interface TypingUnit {
  index: number;
  keyCode: string;
  modifier: Modifier;
  text: string;
  finger: FingerId;
  hand: Hand;
  graphemeIndex: number;
  grapheme: string;
  token: string;
}

export interface BuiltSequence {
  units: TypingUnit[];
  graphemes: string[];
  graphemeUnitRanges: [number, number][];
  text: string;
  charCount: number;
}

export function buildSequence(text: string, layout: KeyboardLayout): BuiltSequence {
  const graphemes = splitGraphemes(text);
  const graphemeUnitRanges: [number, number][] = [];
  const units: TypingUnit[] = [];
  for (let gi = 0; gi < graphemes.length; gi++) {
    const token = graphemes[gi];
    const pairs = layout.reverseMap([token]);
    const start = units.length;
    for (const pair of pairs) {
      const index = units.length;
      units.push({
        index,
        keyCode: pair.lookup.code,
        modifier: pair.lookup.modifier,
        text: pair.lookup.text,
        finger: pair.lookup.finger,
        hand: handForFinger(pair.lookup.finger),
        graphemeIndex: gi,
        grapheme: token,
        token,
      });
    }
    const end = units.length;
    graphemeUnitRanges.push([start, end]);
  }
  return {
    units,
    graphemes,
    graphemeUnitRanges,
    text: graphemes.join(""),
    charCount: units.length,
  };
}

export function graphemeForUnit(sequence: BuiltSequence, unitIndex: number): number {
  if (unitIndex <= 0) return 0;
  if (unitIndex >= sequence.units.length) return sequence.graphemes.length - 1;
  return sequence.units[unitIndex].graphemeIndex;
}

export function remainingText(sequence: BuiltSequence, unitIndex: number): string {
  return sequence.graphemes.slice(graphemeForUnit(sequence, unitIndex)).join("");
}

export function completedText(sequence: BuiltSequence, unitIndex: number): string {
  const count = unitsForGraphemesBefore(sequence, unitIndex);
  return sequence.graphemes.slice(0, count).join("");
}

function unitsForGraphemesBefore(sequence: BuiltSequence, unitIndex: number): number {
  const gi = graphemeForUnit(sequence, unitIndex);
  return sequence.graphemeUnitRanges[gi][0];
}