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

function my(seed: LessonSeed): LessonData {
  return {
    id: `lesson-my-intermediate-${seed.number}`,
    level: "intermediate",
    number: seed.number,
    title: seed.title,
    titleMy: seed.titleMy,
    description: seed.description,
    difficulty: seed.difficulty,
    estimatedMinutes: seed.estimatedMinutes,
    language: "myanmar",
    layoutId: "myanmar3",
    completion: { minAccuracy: seed.minAccuracy, minWpm: seed.minWpm },
    focusKeys: seed.focusKeys,
    targetFingers: seed.targetFingers,
    targetHands: seed.targetHands,
    focus: seed.focus,
    prerequisites: seed.prerequisites,
    phases: seed.phases.map((text) => ({ instruction: text, text })),
  };
}

export const myanmarIntermediateLessons: LessonData[] = [
  my({
    number: 1,
    title: "Food Words",
    titleMy: "စားသောက်ကုန် စကားလုံး",
    description: "Common food words for building vocabulary.",
    difficulty: "easy",
    estimatedMinutes: 8,
    focus: ["words", "unicode", "syllable"],
    prerequisites: ["lesson-my-beginner-25"],
    minAccuracy: 88,
    minWpm: null,
    phases: ["ရေ ဆန် ငါး ကြက် ဝက် နို့ လက်ဖက်ရည် ကော်ဖီ ပေါင်မုန့် သစ်သီး"],
  }),

  my({
    number: 2,
    title: "Question Words",
    titleMy: "မေးခွန်းစကားလုံး",
    description: "Question words: ဘာ, ဘယ်, ဘယ်လို.",
    difficulty: "easy",
    estimatedMinutes: 8,
    focus: ["words", "unicode", "syllable"],
    prerequisites: ["lesson-my-intermediate-1"],
    minAccuracy: 88,
    minWpm: null,
    phases: ["ဘာ ဘယ် ဘယ်လို ဘာကြောင့် ဘယ်အချိန် ဘယ်သူ ဘယ်နှ ဘယ်လောက်"],
  }),

  my({
    number: 3,
    title: "Complex Syllables: Stacked Consonants",
    titleMy: "ရှုပ်ထွေးသည့် ဝဏ္ဏများ - ဗျည်းထပ်တင်",
    description: "Words with stacked consonants using virama.",
    difficulty: "easy",
    estimatedMinutes: 10,
    focus: ["unicode", "syllable"],
    prerequisites: ["lesson-my-intermediate-2"],
    minAccuracy: 90,
    minWpm: null,
    phases: [
      "ခုနှစ် သုံးလုံး မင်္ဂလာပါ အင်္ဂါ",
      "ကြက်သွန်း စားသောက် ဥက္ကဋ္ဌ",
    ],
  }),

  my({
    number: 4,
    title: "Travel Words",
    titleMy: "ခရီးသွား စကားလုံး",
    description: "Travel vocabulary: bus, train, car.",
    difficulty: "easy",
    estimatedMinutes: 8,
    focus: ["words", "unicode"],
    prerequisites: ["lesson-my-intermediate-3"],
    minAccuracy: 88,
    minWpm: null,
    phases: ["ဘူတာ လေယာဉ် ကားမှတ်တိုင် ရေယာဉ်"],
  }),

  my({
    number: 5,
    title: "School Words",
    titleMy: "ကျောင်း စကားလုံး",
    description: "School vocabulary: classroom, exam, teacher, student.",
    difficulty: "easy",
    estimatedMinutes: 8,
    focus: ["words", "unicode"],
    prerequisites: ["lesson-my-intermediate-4"],
    minAccuracy: 88,
    minWpm: null,
    phases: ["စာသင်ခန်း စာမေးပွဲ ဆရာ ကျောင်းသား"],
  }),

  my({
    number: 6,
    title: "Time Expressions",
    titleMy: "အချိန် ဖော်ပြချက်",
    description: "Time words: morning, noon, evening, tomorrow.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["words", "unicode"],
    prerequisites: ["lesson-my-intermediate-5"],
    minAccuracy: 90,
    minWpm: null,
    phases: ["နံနက် နေ့လယ် ညနေ မနက်ဖြန်"],
  }),

  my({
    number: 7,
    title: "Weather Words",
    titleMy: "ရာသီဥတု စကားလုံး",
    description: "Weather vocabulary: rain, sun, wind.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["words", "unicode"],
    prerequisites: ["lesson-my-intermediate-6"],
    minAccuracy: 90,
    minWpm: null,
    phases: ["မိုး နေရောင် လေတိုက် နေသာတယ်"],
  }),

  my({
    number: 8,
    title: "Family Members",
    titleMy: "မိသားစုဝင်",
    description: "Family vocabulary: father, mother, brother, sister.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["words", "unicode"],
    prerequisites: ["lesson-my-intermediate-7"],
    minAccuracy: 90,
    minWpm: null,
    phases: ["အဖေ အမေ အစ်ကို အစ်မ ညီငယ် ညီမငယ်"],
  }),

  my({
    number: 9,
    title: "Numbers and Counting",
    titleMy: "ဂဏန်းကိန်း",
    description: "Myanmar numbers up to 100.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["numbers", "unicode"],
    prerequisites: ["lesson-my-intermediate-8"],
    minAccuracy: 90,
    minWpm: null,
    phases: [
      "၁၀ ၂၀ ၃၀ ၄၀ ၅၀ ၆၀ ၇၀ ၈၀ ၉၀ ၁၀၀",
      "၅ ၁၀ ၁၅ ၂၀ ၂၅ ၃၀ ၃၅ ၄၀ ၄၅ ၅၀",
    ],
  }),

  my({
    number: 10,
    title: "Body Parts + Actions",
    titleMy: "ကိုယ်ခန္ဓာနှင့် လုပ်ဆောင်ချက်",
    description: "Body parts with action verbs.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["words", "sentences", "unicode"],
    prerequisites: ["lesson-my-intermediate-9"],
    minAccuracy: 90,
    minWpm: null,
    phases: [
      "မျက်စိကို ပိတ်ပါ",
      "နားထောင်ပါ",
      "ထိုင်ပါ",
    ],
  }),

  my({
    number: 11,
    title: "Basic Sentences",
    titleMy: "ဝါကျတို လေ့ကျင့်ခန်း",
    description: "Simple declarative sentences.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["sentences", "unicode", "punctuation"],
    prerequisites: ["lesson-my-intermediate-10"],
    minAccuracy: 92,
    minWpm: null,
    phases: [
      "ငါကျောင်းသွားတယ်။",
      "အမေအိမ်မှာလား။",
      "ဆရာကခွေးကိုခေါ်တယ်။",
    ],
  }),

  my({
    number: 12,
    title: "Question Sentences",
    titleMy: "မေးခွန်းဝါကျ",
    description: "Sentences that ask questions.",
    difficulty: "medium",
    estimatedMinutes: 10,
    focus: ["sentences", "unicode", "punctuation"],
    prerequisites: ["lesson-my-intermediate-11"],
    minAccuracy: 92,
    minWpm: null,
    phases: [
      "ဒါဘာလဲ။",
      "ဒီစာအုပ်က ဘယ်သူ့စာအုပ်လဲ။",
      "ဘယ်နှယောက်ရှိလဲ။",
    ],
  }),

  my({
    number: 13,
    title: "Informal Sentences",
    titleMy: "အလွတ်စကားပြော ဝါကျ",
    description: "Conversational sentences for everyday use.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["sentences", "unicode", "punctuation"],
    prerequisites: ["lesson-my-intermediate-12"],
    minAccuracy: 92,
    minWpm: 15,
    phases: [
      "ဒီနေ့ရာသီဥတုက သာယာတယ်။",
      "ညနေကျရင်တော့ မိုးရွာနိုင်တယ်။",
      "ငါတို့စောင့်ကြည့်ကြရအောင်။",
    ],
  }),

  my({
    number: 14,
    title: "Short Paragraph 1",
    titleMy: "စာပိုဒ်တို (၁)",
    description: "Type a short paragraph about oneself.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["sentences", "unicode", "punctuation", "speed"],
    prerequisites: ["lesson-my-intermediate-13"],
    minAccuracy: 92,
    minWpm: 18,
    phases: [
      "ကျွန်တော်မွန်မြို့ကလာတယ်။ မန္တလေးမှာကျောင်းတက်တယ်။ အခုတော့ ရန်ကုန်မှာအလုပ်လုပ်တယ်။",
    ],
  }),

  my({
    number: 15,
    title: "Short Paragraph 2",
    titleMy: "စာပိုဒ်တို (၂)",
    description: "Type a paragraph about daily routine.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["sentences", "unicode", "punctuation", "speed"],
    prerequisites: ["lesson-my-intermediate-14"],
    minAccuracy: 93,
    minWpm: 18,
    phases: [
      "နံနက် ခြောက်နာရီမှာ အိပ်ရာကထတယ်။ မျက်နှာသစ်ပြီး လက်ဖက်ရည်သောက်တယ်။ ပြီးတော့ အလုပ်သွားတယ်။",
    ],
  }),
];
