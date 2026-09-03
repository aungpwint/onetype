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
    id: `lesson-en-intermediate-${seed.number}`,
    level: "intermediate",
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

export const englishIntermediateLessons: LessonData[] = [
  en({
    number: 1,
    title: "High-Frequency Words 1",
    titleMy: "အသုံးများဆုံး စကားလုံးများ (၁)",
    description: "The 20 most common English words.",
    difficulty: "easy",
    estimatedMinutes: 8,
    focus: ["words", "speed"],
    prerequisites: ["lesson-en-beginner-30"],
    minAccuracy: 90,
    minWpm: 18,
    phases: [
      "the be to of and a in that have I",
      "it for not on with he as you do at",
      "the be to of and a in that have I it for not on with",
    ],
  }),

  en({
    number: 2,
    title: "High-Frequency Words 2",
    titleMy: "အသုံးများဆုံး စကားလုံးများ (၂)",
    description: "More high-frequency words for building rhythm.",
    difficulty: "easy",
    estimatedMinutes: 8,
    focus: ["words", "speed"],
    prerequisites: ["lesson-en-intermediate-1"],
    minAccuracy: 90,
    minWpm: 18,
    phases: [
      "this but his by from they we say her she or",
      "an will my one all would there their what so",
      "this but his by from they we say her she or an will my",
    ],
  }),

  en({
    number: 3,
    title: "Common Word Pairs",
    titleMy: "အသုံးများ စကားလုံး စုံတွဲ",
    description: "Common two-word combinations for smooth typing.",
    difficulty: "easy",
    estimatedMinutes: 8,
    focus: ["words", "hand-alternation", "speed"],
    prerequisites: ["lesson-en-intermediate-2"],
    minAccuracy: 90,
    minWpm: 20,
    phases: [
      "of the in the to the at the from the",
      "for the and the with the on the in the",
      "it is he is she is we are they are",
    ],
  }),

  en({
    number: 4,
    title: "Same-Hand Difficult Patterns",
    titleMy: "တစ်ဖက်တည်းလက် ခက်ခဲသည့် ပုံစံများ",
    description: "Practice typing consecutive same-hand keys for fluency.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["same-hand", "finger-control", "accuracy"],
    prerequisites: ["lesson-en-intermediate-3"],
    minAccuracy: 90,
    minWpm: 20,
    phases: [
      "asd asd sdf sdf dfg dfg",
      "jkl jkl kl; kl; hjk hjk",
      "qwe qwe wer ert wert erty",
      "yui yui iop uio iopiop",
      "zxc zxc xcv cvb xcvbxcv",
      "nm nm nm nm nm nm nm nm nm nm",
    ],
  }),

  en({
    number: 5,
    title: "Alternating-Hand Words",
    titleMy: "လက်နှစ်ဖက် အလှည့်ကျ စကားလုံး",
    description: "Words that alternate between left and right hands.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["hand-alternation", "words", "speed"],
    prerequisites: ["lesson-en-intermediate-4"],
    minAccuracy: 90,
    minWpm: 22,
    phases: [
      "alternating quick jumpy fix band",
      "kingdom label jump theme common",
      "figured burned paper novel video",
      "noticed lambda applied changes global",
    ],
  }),

  en({
    number: 6,
    title: "Simple Sentences 1",
    titleMy: "ရိုးရှင်းသော ဝါကျတိုများ (၁)",
    description: "Short, common sentences for building typing rhythm.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["sentences", "words", "accuracy"],
    prerequisites: ["lesson-en-intermediate-5"],
    minAccuracy: 92,
    minWpm: 20,
    phases: [
      "This is my pen and that is your book.",
      "We go to school every morning by bus.",
      "She has a small dog named Lucky.",
      "The sun rises in the east every day.",
    ],
  }),

  en({
    number: 7,
    title: "Simple Sentences 2",
    titleMy: "ရိုးရှင်းသော ဝါကျတိုများ (၂)",
    description: "Sentences with common verbs and everyday vocabulary.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["sentences", "words", "accuracy"],
    prerequisites: ["lesson-en-intermediate-6"],
    minAccuracy: 92,
    minWpm: 22,
    phases: [
      "They play football in the park after school.",
      "I like to read a story before I sleep.",
      "The teacher tells us to keep quiet in class.",
      "We should drink water and eat fruit every day.",
    ],
  }),

  en({
    number: 8,
    title: "Contractions",
    titleMy: "ပေါင်းကူး စကားလုံးများ",
    description: "Common contractions: don't, can't, won't, etc.",
    difficulty: "medium",
    estimatedMinutes: 8,
    focus: ["words", "punctuation", "accuracy"],
    prerequisites: ["lesson-en-intermediate-7"],
    minAccuracy: 92,
    minWpm: 20,
    phases: [
      "do not don't cannot can't will not won't",
      "I am I'm you are you're it is it's",
      "he is he's she has she's we will we'll",
      "I will I'll you have you've they have they've",
    ],
  }),

  en({
    number: 9,
    title: "Possessives and Apostrophes",
    titleMy: "ပိုင်ဆိုင်မှုနှင့် apostrophe",
    description: "Possessives: Sam's book, the cat's tail.",
    difficulty: "medium",
    estimatedMinutes: 8,
    focus: ["words", "punctuation", "accuracy"],
    prerequisites: ["lesson-en-intermediate-8"],
    minAccuracy: 92,
    minWpm: 20,
    phases: [
      "Sam's book Mary's bag the cat's tail",
      "the children's toys my mother's house",
      "It's raining and the sky's very dark",
      "Tom's dog ran to Kate's garden.",
    ],
  }),

  en({
    number: 10,
    title: "Compound Words",
    titleMy: "ပေါင်းစပ် စကားလုံးများ",
    description: "Words made of two smaller words. Build fluency with longer words.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["words", "same-hand", "accuracy"],
    prerequisites: ["lesson-en-intermediate-9"],
    minAccuracy: 92,
    minWpm: 22,
    phases: [
      "sunshine rainbow moonlight fireplace",
      "notebook keyboard laptop bookstore",
      "football basketball breakfast homework",
      "outside inside anything someone",
    ],
  }),

  en({
    number: 11,
    title: "Question Sentences",
    titleMy: "မေးခွန်းဝါကျ",
    description: "Sentences that ask questions. Practice question mark usage.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["sentences", "punctuation", "accuracy"],
    prerequisites: ["lesson-en-intermediate-10"],
    minAccuracy: 92,
    minWpm: 22,
    phases: [
      "What is your name?",
      "Where do you live?",
      "How old are you?",
      "Do you have a brother?",
      "Why is the sky blue?",
      "Who made the light?",
    ],
  }),

  en({
    number: 12,
    title: "Dialogue Typing",
    titleMy: "စကားပြော ရိုက်ခြင်း",
    description: "Type conversations with quotation marks and punctuation.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["sentences", "punctuation", "shift", "accuracy"],
    prerequisites: ["lesson-en-intermediate-11"],
    minAccuracy: 93,
    minWpm: 24,
    phases: [
      '"Hello, how are you?" "I am fine."',
      '"What did you do yesterday?" "I played with friends."',
      '"Where are you going?" "I am going to school."',
      '"Can I come?" "Yes, let us go together."',
    ],
  }),

  en({
    number: 13,
    title: "Speed Building 1",
    titleMy: "အရှိန်မြှင့် (၁)",
    description: "Type common pangrams and sentences quickly.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["speed", "accuracy"],
    prerequisites: ["lesson-en-intermediate-12"],
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "the quick brown fox jumps over the lazy dog",
      "pack my box with five dozen liquor jugs",
      "the quick brown fox jumps over the lazy dog again",
    ],
  }),

  en({
    number: 14,
    title: "Speed Building 2",
    titleMy: "အရှိန်မြှင့် (၂)",
    description: "Longer passages for speed and rhythm.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["speed", "accuracy", "sentences"],
    prerequisites: ["lesson-en-intermediate-13"],
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "Every morning the sun rises in the east and makes the sky bright with soft golden light.",
      "We should drink water, eat healthy food, and sleep well to stay strong every day.",
      "The children played in the garden until the sun went down behind the hills.",
    ],
  }),

  en({
    number: 15,
    title: "Short Paragraph 1",
    titleMy: "စာပိုဒ်တို (၁)",
    description: "Type a short paragraph. Build stamina and consistency.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-intermediate-14"],
    minAccuracy: 92,
    minWpm: 24,
    phases: [
      "It is a warm sunny day. The birds sing in the trees. We sit under a big tree and eat lunch.",
    ],
  }),

  en({
    number: 16,
    title: "Short Paragraph 2",
    titleMy: "စာပိုဒ်တို (၂)",
    description: "A longer paragraph about a familiar topic.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-intermediate-15"],
    minAccuracy: 92,
    minWpm: 24,
    phases: [
      "The cat sleeps on the soft mat all day. At night it wakes up and walks in the garden. It catches a small mouse and brings it to the door.",
    ],
  }),

  en({
    number: 17,
    title: "Difficult Finger Patterns",
    titleMy: "ခက်ခဲသည့် လက်ချောင်း ပုံစံများ",
    description: "Practice awkward letter combinations that cause errors.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["finger-control", "accuracy", "same-hand"],
    prerequisites: ["lesson-en-intermediate-16"],
    minAccuracy: 93,
    minWpm: 24,
    phases: [
      "ed ed ed rf rf rf tg tg tg",
      "ki ki ki lo lo lo ju ju ju",
      "pq pq pq wx wx wx vb vb vb",
      "edc rfv tgb ki lo ju pq wx",
      "freedom evaluate privilege irregular",
      "judgment knowledge questionnaire",
    ],
  }),

  en({
    number: 18,
    title: "Intermediate Review",
    titleMy: "အလယ်အလတ် ပြန်လည်သုံးသပ်ခြင်း",
    description: "Comprehensive intermediate review with mixed content.",
    difficulty: "hard",
    estimatedMinutes: 14,
    focus: ["speed", "accuracy", "words", "sentences"],
    prerequisites: ["lesson-en-intermediate-17"],
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "the quick brown fox jumps over the lazy dog",
      "Pack my box with five dozen liquor jugs.",
      "She sells seashells by the seashore.",
      "How much wood would a woodchuck chuck?",
      "A good typist can type without looking at the keyboard.",
    ],
  }),
];
