import type { Difficulty } from "../../types";
import type { LessonData } from "../curriculum/types";
import { toPhases } from "../curriculum/types";

interface LessonSeed {
  number: number;
  title: string;
  titleMy: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  focusKeys?: string[];
  minAccuracy: number;
  minWpm: number | null;
  phases: (string | { i: string; t: string })[];
}

function lesson(seed: LessonSeed): LessonData {
  const phases = seed.phases.map((phase) => {
    if (typeof phase === "string") {
      return { instruction: phase, text: phase };
    }
    return { instruction: phase.i, text: phase.t };
  });
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
    phases: toPhases(
      phases.map((p) => ({ kind: "text", instruction: p.instruction, text: p.text })),
    ),
  };
}

const EVERYDAY_WORDS = [
  "ရေ", "ဆန်", "ငါး", "ကြက်", "ဝက်", "နို့", "လက်ဖက်ရည်", "ကော်ဖီ", "ပေါင်မုန့်", "သစ်သီး",
];

const QUESTION_WORDS = [
  "ဘာ", "ဘယ်", "ဘယ်လို", "ဘာကြောင့်", "ဘယ်အချိန်", "ဘယ်သူ", "ဘယ်နှ", "ဘယ်လောက်",
];

export const myanmarIntermediateLessons: LessonData[] = [
  lesson({
    number: 1,
    title: "Food Words",
    titleMy: "စားသောက်ကုန် စကားလုံး လေ့ကျင့်ခန်း",
    description: "နေ့စဉ်သုံး စားသောက်ကုန်စာလုံးများ",
    difficulty: "easy",
    estimatedMinutes: 8,
    minAccuracy: 88,
    minWpm: null,
    focusKeys: ["KeyR", "KeyW", "KeyE", "KeyF"],
    phases: [{ i: "အစားအစာများ", t: EVERYDAY_WORDS.join(" ") }],
  }),
  lesson({
    number: 2,
    title: "Question Words",
    titleMy: "မေးခွန်းစကားလုံး လေ့ကျင့်ခန်း",
    description: "ဘာ၊ ဘယ်၊ ဘယ်လို စသည့် မေးခွန်းစကားလုံးများ",
    difficulty: "easy",
    estimatedMinutes: 8,
    minAccuracy: 88,
    minWpm: null,
    focusKeys: ["KeyD", "KeyJ", "KeyS"],
    phases: [{ i: "မေးခွန်းများ", t: QUESTION_WORDS.join(" ") }],
  }),
  lesson({
    number: 3,
    title: "Stacked Consonants 1",
    titleMy: "ထည့်-ထပ်စာလုံး လေ့ကျင့်ခန်း (၁)",
    description: "ေ္ အသတ်ဖြင့် ဗျည်းထပ်တင်စာလုံးများ",
    difficulty: "easy",
    estimatedMinutes: 10,
    minAccuracy: 90,
    minWpm: null,
    focusKeys: ["KeyF", "ShiftLeft", "ShiftRight"],
    phases: [
      { i: "ဗျည်းထပ်တင်ခြင်း", t: "ခုနှစ် သုံးလုံး မင်္ဂလာပါ မင်္ဂလာပါ အင်္ဂါ အင်္ဂါ" },
      { i: "ရက္ခိုက် စကားလုံးများ", t: "ကြက်သွန်း ကြက်သွန်း စားသောက် စားသောက် ဥက္ကဋ္ဌ ဥက္ကဋ္ဌ" },
    ],
  }),
  lesson({
    number: 4,
    title: "Travel Words",
    titleMy: "ခရီးသွား စကားလုံး လေ့ကျင့်ခန်း",
    description: "ဘူတာ၊ လေယာဉ်၊ ကားမှတ်တိုင် စသည့် ခရီးသွားစကားလုံးများ",
    difficulty: "easy",
    estimatedMinutes: 8,
    minAccuracy: 88,
    minWpm: null,
    phases: ["ဘူတာ ဘူတာ လေယာဉ် လေယာဉ် ကားမှတ်တိုင် ကားမှတ်တိုင် ရေယာဉ် ရေယာဉ်"],
  }),
  lesson({
    number: 5,
    title: "School Words",
    titleMy: "ကျောင်း စကားလုံး လေ့ကျင့်ခန်း",
    description: "စာသင်ခန်း၊ စာမေးပွဲ၊ ဆရာ၊ ကျောင်းသား",
    difficulty: "easy",
    estimatedMinutes: 8,
    minAccuracy: 88,
    minWpm: null,
    phases: ["စာသင်ခန်း စာသင်ခန်း စာမေးပွဲ စာမေးပွဲ ကျောင်းသား ကျောင်းသား ဆရာ ဆရာ"],
  }),
  lesson({
    number: 6,
    title: "Time Expressions",
    titleMy: "အချိန် ဖော်ပြချက် လေ့ကျင့်ခန်း",
    description: "နံနက်၊ နေ့၊ ည၊ မနက်ဖြန် စသည့် အချိန်စကားလုံးများ",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 90,
    minWpm: null,
    focusKeys: ["ShiftLeft"],
    phases: ["နံနက် နံနက် နေ့လယ် နေ့လယ် ညနေ ညနေ မနက်ဖြန် မနက်ဖြန်"],
  }),
  lesson({
    number: 7,
    title: "Weather Words",
    titleMy: "ရာသီဥတု စကားလုံး လေ့ကျင့်ခန်း",
    description: "မိုး၊ နေ၊ လေ၊ ဆင်း စသည့် ရာသီဥတုစကားလုံးများ",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 90,
    minWpm: null,
    phases: ["မိုး မိုး နေရောင် နေရောင် လေတိုက် လေတိုက် နေသာတယ် နေသာတယ်"],
  }),
  lesson({
    number: 8,
    title: "Family Members",
    titleMy: "မိသားစုဝင် လေ့ကျင့်ခန်း",
    description: "အဖေ၊ အမေ၊ ညီ၊ ညီမ၊ အစ်ကို စသည့် မိသားစုဝင် အမည်များ",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 90,
    minWpm: null,
    phases: ["အဖေ အဖေ အမေ အမေ အစ်ကို အစ်ကို အစ်မ အစ်မ ညီငယ် ညီမငယ်"],
  }),
  lesson({
    number: 9,
    title: "Numbers and Counting",
    titleMy: "ဂဏန်းကိန်း လေ့ကျင့်ခန်း",
    description: "မြန်မာဂဏန်းများ ၅၀ အထိ ရေတွက်ခြင်း",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 90,
    minWpm: null,
    focusKeys: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"],
    phases: ["၁၀ ၂၀ ၃၀ ၄၀ ၅၀ ၆၀ ၇၀ ၈၀ ၉၀ ၁၀၀", "၅ ၁၀ ၁၅ ၂၀ ၂၅ ၃၀ ၃၅ ၄၀ ၄၅ ၅၀"],
  }),
  lesson({
    number: 10,
    title: "Body Parts + Actions",
    titleMy: "ကိုယ်ခန္ဓာနှင့် လုပ်ဆောင်ချက် လေ့ကျင့်ခန်း",
    description: "မျက်စိ၊ နား၊ လက်၊ ခြေ နှင့် ကြိယာစကားလုံးများ",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 90,
    minWpm: null,
    phases: ["မျက်စိကို ပိတ်ပါ မျက်စိကို ပိတ်ပါ နားထောင်ပါ နားထောင်ပါ ထိုင်ပါ ထိုင်ပါ"],
  }),
  lesson({
    number: 11,
    title: "Basic Sentences",
    titleMy: "ဝါကျတို လေ့ကျင့်ခန်း",
    description: "ရိုးရှင်းသော ဝါကျတိုများ ရိုက်ခြင်း",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 92,
    minWpm: null,
    phases: [
      "ငါကျောင်းသွားတယ်။",
      "အမေအိမ်မှာလား။",
      "ဆရာကခွေးကိုခေါ်တယ်။",
    ],
  }),
  lesson({
    number: 12,
    title: "Question Sentences",
    titleMy: "မေးခွန်းဝါကျ လေ့ကျင့်ခန်း",
    description: "ဘာ၊ ဘယ်နှ စသည့် မေးခွန်းဝါကျများ",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 92,
    minWpm: null,
    phases: [
      "ဒါဘာလဲ။",
      "ဒီစာအုပ်က ဘယ်သူ့စာအုပ်လဲ။",
      "ဘယ်နှယောက်ရှိလဲ။",
    ],
  }),
  lesson({
    number: 13,
    title: "Informal Sentences",
    titleMy: "အလွတ်စကားပြော ဝါကျ လေ့ကျင့်ခန်း",
    description: "နေ့စဉ်သုံး စကားပြောဝါကျများ",
    difficulty: "hard",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 15,
    phases: [
      "ဒီနေ့ရာသီဥတုက သာယာတယ်။",
      "ညနေကျရင်တော့ မိုးရွာနိုင်တယ်။",
      "ငါတို့စောင့်ကြည့်ကြရအောင်။",
    ],
  }),
  lesson({
    number: 14,
    title: "Short Paragraph 1",
    titleMy: "စာပိုဒ်တို (၁)",
    description: "ႏိုင္ငံသုံးစကားပြော စာပိုဒ်တို",
    difficulty: "hard",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 18,
    phases: [
      "ကျွန်တော်မွန်မြို့ကလာတယ်။ မန္တလေးမှာကျောင်းတက်တယ်။ အခုတော့ ရန်ကုန်မှာအလုပ်လုပ်တယ်။",
    ],
  }),
  lesson({
    number: 15,
    title: "Short Paragraph 2",
    titleMy: "စာပိုဒ်တို (၂)",
    description: "နေ့စဉ်လုပ်ငန်းစဉ် အကြောင်း စာပိုဒ်တို",
    difficulty: "hard",
    estimatedMinutes: 12,
    minAccuracy: 93,
    minWpm: 18,
    phases: [
      "နံနက် ခြောက်နာရီမှာ အိပ်ရာကထတယ်။ မျက်နှာသစ်ပြီး လက်ဖက်ရည်သောက်တယ်။ ပြီးတော့ အလုပ်သွားတယ်။",
    ],
  }),
];