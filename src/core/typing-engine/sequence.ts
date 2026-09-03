import type { Modifier } from "../../types";
import type { Hand } from "../../types";
import type { FingerId } from "../../types";
import { KeyboardLayout, shiftHandFor } from "../keyboard-layout/layout";
import { splitGraphemes } from "../unicode/graphemes";
import { splitMyanmarSyllables } from "../unicode/myanmar";

export interface TypingUnit {
  index: number;
  keyCode: string;
  modifier: Modifier;
  text: string;
  finger: FingerId;
  hand: Hand;
  shiftHand: Hand | null;
  graphemeIndex: number;
  grapheme: string;
}

export interface BuiltSequence {
  units: TypingUnit[];
  graphemes: string[];
  graphemeUnitRanges: [number, number][];
  text: string;
  charCount: number;
}

export function buildSequence(text: string, layout: KeyboardLayout): BuiltSequence {
  // Myanmar text is split into syllable clusters (not plain graphemes) so the
  // whole cluster — base consonant + medials + vowel signs + kinzi/stacking +
  // tone marks — is addressed as a single unit for typing and deletion.
  const graphemes = layout.language === "myanmar" ? splitMyanmarSyllables(text) : splitGraphemes(text);
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
        hand: pair.lookup.hand,
        shiftHand: pair.lookup.modifier === "shift" ? shiftHandFor(pair.lookup.hand) : null,
        graphemeIndex: gi,
        grapheme: token,
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

/**
 * The unit index of the start of the cluster that owns the unit preceding
 * `unitIndex`. Used for cluster-aware Backspace: deleting removes a whole
 * grapheme/syllable cluster, not a single combining mark. For English (one
 * unit per cluster) this is simply `unitIndex - 1`, so it is safe universally.
 */
export function clusterStartForUnit(sequence: BuiltSequence, unitIndex: number): number {
  if (unitIndex <= 0) return 0;
  const gi = graphemeForUnit(sequence, unitIndex - 1);
  return sequence.graphemeUnitRanges[gi][0];
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

export interface GraphemeRun {
  index: number;
  text: string;
  startUnit: number;
  endUnit: number;
}

export function graphemeUnitRuns(sequence: BuiltSequence): GraphemeRun[] {
  const units = sequence.units;
  const gtexts = sequence.graphemes;
  const runs: GraphemeRun[] = [];
  let gi = 0;
  for (let u = 0; u < units.length && gi < gtexts.length; ) {
    const token = gtexts[gi];
    let e = u;
    while (e < units.length && units[e].grapheme === token) e++;
    runs.push({
      index: gi,
      text: token,
      startUnit: u,
      endUnit: e,
    });
    gi++;
    u = e;
  }
  return runs;
}