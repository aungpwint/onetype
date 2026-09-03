import type { Difficulty, FingerId, Hand, LessonFocus } from "../../types";
import type { LessonData } from "../curriculum/types";

interface LessonSeed {
  number: number;
  title: string;
  titleMy: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  focusKeys?: string[];
  targetFingers?: FingerId[];
  targetHands?: Hand[];
  focus?: LessonFocus[];
  prerequisites?: string[];
  minAccuracy: number;
  minWpm: number | null;
  phases: string[];
}

function en(seed: LessonSeed): LessonData {
  return {
    id: `lesson-en-beginner-${seed.number}`,
    level: "beginner",
    number: seed.number,
    title: seed.title,
    titleMy: seed.titleMy,
    description: seed.description,
    difficulty: seed.difficulty,
    estimatedMinutes: seed.estimatedMinutes,
    language: "english",
    layoutId: "english-qwerty",
    completion: { minAccuracy: seed.minAccuracy, minWpm: seed.minWpm },
    focusKeys: seed.focusKeys,
    targetFingers: seed.targetFingers,
    targetHands: seed.targetHands,
    focus: seed.focus,
    prerequisites: seed.prerequisites,
    phases: seed.phases.map((text) => ({ instruction: text, text })),
  };
}

export const englishNumbersLessons: LessonData[] = [
  en({
    number: 44,
    title: "Number Row Left Hand: 1 2 3 4 5",
    titleMy: "ဂဏန်းတန်း ဘယ်ဘက်လက် - ၁ ၂ ၃ ၄ ၅",
    description: "Left pinky: 1, ring: 2, middle: 3, index: 4-5.",
    difficulty: "easy",
    estimatedMinutes: 8,
    focusKeys: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"],
    targetFingers: ["left-pinky", "left-ring", "left-middle", "left-index"],
    targetHands: ["left"],
    focus: ["numbers", "key-memory", "finger-control"],
    prerequisites: ["lesson-en-beginner-27"],
    minAccuracy: 87,
    minWpm: null,
    phases: [
      "1 1 1 1 1 2 2 2 2 2 3 3 3 3 3 4 4 4 4 4 5 5 5 5 5",
      "1 2 3 4 5 1 2 3 4 5 1 2 3 4 5",
      "1 3 5 1 3 5 1 3 5 1 3 5 1 3 5",
      "5 4 3 2 1 5 4 3 2 1 5 4 3 2 1",
      "12 34 5 12 34 5 12 34 5 12 34 5",
      "12345 12345 12345 12345 12345",
    ],
  }),

  en({
    number: 45,
    title: "Number Row Right Hand: 6 7 8 9 0",
    titleMy: "ဂဏန်းတန်း ညာဘက်လက် - ၆ ၇ ၈ ၉ ၀",
    description: "Right index: 6-7, middle: 8, ring: 9, pinky: 0.",
    difficulty: "easy",
    estimatedMinutes: 8,
    focusKeys: ["Digit6", "Digit7", "Digit8", "Digit9", "Digit0"],
    targetFingers: ["right-index", "right-middle", "right-ring", "right-pinky"],
    targetHands: ["right"],
    focus: ["numbers", "key-memory", "finger-control"],
    prerequisites: ["lesson-en-beginner-27"],
    minAccuracy: 87,
    minWpm: null,
    phases: [
      "6 6 6 6 6 7 7 7 7 7 8 8 8 8 8 9 9 9 9 9 0 0 0 0 0",
      "6 7 8 9 0 6 7 8 9 0 6 7 8 9 0",
      "6 8 0 6 8 0 6 8 0 6 8 0 6 8 0",
      "0 9 8 7 6 0 9 8 7 6 0 9 8 7 6",
      "67 89 0 67 89 0 67 89 0 67 89 0",
      "67890 67890 67890 67890 67890",
    ],
  }),

  en({
    number: 46,
    title: "Full Number Row",
    titleMy: "ဂဏန်းတန်း အပြည့်",
    description: "Type all digits 0-9 in alternating patterns.",
    difficulty: "easy",
    estimatedMinutes: 8,
    focusKeys: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"],
    targetHands: ["left", "right"],
    focus: ["numbers", "hand-alternation", "key-memory"],
    prerequisites: ["lesson-en-beginner-44", "lesson-en-beginner-45"],
    minAccuracy: 88,
    minWpm: null,
    phases: [
      "1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0",
      "0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1",
      "1 3 5 7 9 2 4 6 8 0 1 3 5 7 9 2 4 6 8 0",
      "1234567890 0987654321 1234567890",
    ],
  }),

  en({
    number: 47,
    title: "Number Patterns",
    titleMy: "ဂဏန်းပုံစံများ",
    description: "Number patterns that train finger transitions on the number row.",
    difficulty: "medium",
    estimatedMinutes: 8,
    focus: ["numbers", "finger-control"],
    prerequisites: ["lesson-en-beginner-46"],
    minAccuracy: 88,
    minWpm: null,
    phases: [
      "11 22 33 44 55 66 77 88 99 00",
      "12 23 34 45 56 67 78 89 90",
      "21 32 43 54 65 76 87 98 09",
      "10 20 30 40 50 60 70 80 90 100",
    ],
  }),

  en({
    number: 48,
    title: "Numbers and Letters Mixed",
    titleMy: "ဂဏန်းနှင့် အက္ခရာ ရောနှော",
    description: "Combine numbers and letters. Practice switching between rows.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["numbers", "words", "row-transition"],
    prerequisites: ["lesson-en-beginner-47"],
    minAccuracy: 88,
    minWpm: null,
    phases: [
      "1a 2b 3c 4d 5e 6f 7g 8h 9i 0j",
      "a1 b2 c3 d4 e5 f6 g7 h8 i9 j0",
      "1st 2nd 3rd 4th 5th 6th 7th 8th 9th 10th",
      "page 1 chapter 2 line 3 word 4",
      "2024 1990 2025 1985 2000 2016 2030",
    ],
  }),

  en({
    number: 49,
    title: "Shift Number Symbols: ! @ # $ %",
    titleMy: "Shift ဂဏန်းသင်္ကေတ: ! @ # $ %",
    description: "Left hand Shift symbols: ! @ # $ %",
    difficulty: "medium",
    estimatedMinutes: 10,
    focusKeys: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "ShiftRight"],
    targetHands: ["right", "left"],
    focus: ["shift", "numbers", "symbols"],
    prerequisites: ["lesson-en-beginner-41"],
    minAccuracy: 88,
    minWpm: null,
    phases: [
      "! ! ! ! ! ! ! ! ! !",
      "@ @ @ @ @ @ @ @ @ @",
      "# # # # # # # # # #",
      "$ $ $ $ $ $ $ $ $ $",
      "% % % % % % % % % %",
      "!@! @#@ #$# $%$",
      "!@#$% !@#$% !@#$% !@#$%",
    ],
  }),

  en({
    number: 50,
    title: "Shift Number Symbols: ^ & * ( )",
    titleMy: "Shift ဂဏန်းသင်္ကေတ: ^ & * ( )",
    description: "Right hand Shift symbols: ^ & * ( )",
    difficulty: "medium",
    estimatedMinutes: 10,
    focusKeys: ["Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "ShiftLeft"],
    targetHands: ["left", "right"],
    focus: ["shift", "numbers", "symbols"],
    prerequisites: ["lesson-en-beginner-49"],
    minAccuracy: 88,
    minWpm: null,
    phases: [
      "^ ^ ^ ^ ^ ^ ^ ^ ^ ^",
      "& & & & & & & & & &",
      "* * * * * * * * * *",
      "( ( ( ( ( ( ( ( ( (",
      ") ) ) ) ) ) ) ) ) )",
      "^&* (^&* (^&* (^&*",
      "^&*( ) ^&*( ) ^&*( )",
    ],
  }),

  en({
    number: 51,
    title: "All Shift Symbols Review",
    titleMy: "Shift သင်္ကေတ အားလုံး ပြန်လည်သုံးသပ်ခြင်း",
    description: "All 10 shift-number symbols in sequence and patterns.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["shift", "symbols", "accuracy"],
    prerequisites: ["lesson-en-beginner-50"],
    minAccuracy: 88,
    minWpm: null,
    phases: [
      "!@#$%^&*()",
      "!@#$%^&*() !@#$%^&*()",
      "())(*&%$#@!",
      "2+2=4 3*3=9 10-5=5",
    ],
  }),

  en({
    number: 52,
    title: "Punctuation: Period and Comma",
    titleMy: "နားသတ်: ခြေစွန်းနှင့် ဝမ်းခြေ",
    description: "Period and comma in sentences.",
    difficulty: "medium",
    estimatedMinutes: 8,
    focusKeys: ["Period", "Comma"],
    focus: ["punctuation", "sentences"],
    prerequisites: ["lesson-en-beginner-30"],
    minAccuracy: 90,
    minWpm: null,
    phases: [
      ". . . . . . . . . .",
      ", , , , , , , , , ,",
      "a, b, c, d, e, f.",
      "one, two, three, four.",
      "hello, world. yes, no.",
      "I am here. you are there.",
    ],
  }),

  en({
    number: 53,
    title: "Punctuation: Semicolon and Colon",
    titleMy: "နားသတ်: နှစ်ချောင်းငင်နှင့် နှစ်ချက်",
    description: "Semicolon and colon in practice.",
    difficulty: "medium",
    estimatedMinutes: 8,
    focusKeys: ["Semicolon"],
    focus: ["punctuation", "sentences"],
    prerequisites: ["lesson-en-beginner-52"],
    minAccuracy: 90,
    minWpm: null,
    phases: [
      "; ; ; ; ; ; ; ; ; ;",
      ": : : : : : : : : :",
      "one; two; three; four.",
      "a: b: c: d: e:.",
      "red; blue; green; yellow.",
    ],
  }),

  en({
    number: 54,
    title: "Punctuation: Question and Exclamation",
    titleMy: "နားသတ်: မေးခွန်းနှင့် အံ့ဩ",
    description: "Question marks and exclamation marks.",
    difficulty: "medium",
    estimatedMinutes: 8,
    focusKeys: ["Slash"],
    focus: ["punctuation", "shift", "sentences"],
    prerequisites: ["lesson-en-beginner-53"],
    minAccuracy: 90,
    minWpm: null,
    phases: [
      "? ? ? ? ? ? ? ? ? ?",
      "! ! ! ! ! ! ! ! ! !",
      "yes? no? why? how?",
      "wow! great! nice! good!",
      "can you? I can! do it?",
      "hello? yes! thank you.",
    ],
  }),

  en({
    number: 55,
    title: "Punctuation: Quotes and Brackets",
    titleMy: "နားသတ်:  quote နှင့် brackets",
    description: "Quotation marks, single quotes, and brackets.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focusKeys: ["Quote", "BracketLeft", "BracketRight"],
    focus: ["punctuation", "shift", "sentences"],
    prerequisites: ["lesson-en-beginner-54"],
    minAccuracy: 88,
    minWpm: null,
    phases: [
      '" " " " " " " " " "',
      "' ' ' ' ' ' ' ' ' '",
      "[ ] [ ] [ ] [ ] [ ]",
      "{ } { } { } { } { }",
      '"hello" "world" "test"',
      "[one] [two] [three]",
    ],
  }),

  en({
    number: 56,
    title: "Numbers and Symbols: Final Review",
    titleMy: "ဂဏန်းနှင့် သင်္ကေတ နောက်ဆုံး ပြန်လည်သုံးသပ်ခြင်း",
    description: "Complete review of numbers, symbols, and punctuation.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["numbers", "symbols", "punctuation", "accuracy"],
    prerequisites: ["lesson-en-beginner-55"],
    minAccuracy: 90,
    minWpm: 16,
    phases: [
      "1+2=3 4+5=9 6+7=13 8+9=17",
      "I have 3 cats and 2 dogs!",
      "Call me at (555) 123-4567.",
      "Email: test@example.com",
      "Price: $19.99 (10% off)",
    ],
  }),
];
