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
    id: `lesson-my-advanced-${seed.number}`,
    level: "advanced",
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

export const myanmarAdvancedLessons: LessonData[] = [
  my({
    number: 1,
    title: "Complex Sentence Practice",
    titleMy: "ရှုပ်ထွေးသည့် ဝါကျ လေ့ကျင့်ခန်း",
    description: "Type complex sentences accurately.",
    difficulty: "easy",
    estimatedMinutes: 10,
    focus: ["sentences", "unicode", "accuracy"],
    prerequisites: ["lesson-my-intermediate-15"],
    minAccuracy: 90,
    minWpm: 18,
    phases: [
      "စကားကို ဖြေးဖြေးပြောပြီး ကြိုးစားပါ။",
      "လူတိုင်း အမှားလုပ်တတ်တယ်။",
      "ကျောင်းသားတွေ အချိန်မှန်လာကြတယ်။",
    ],
  }),

  my({
    number: 2,
    title: "Punctuation: ၍ ၑ ၒ",
    titleMy: "သင်္ကေတအက္ခရာ",
    description: "Practice with formal Myanmar punctuation marks.",
    difficulty: "easy",
    estimatedMinutes: 10,
    focus: ["punctuation", "unicode", "sentences"],
    prerequisites: ["lesson-my-advanced-1"],
    minAccuracy: 90,
    minWpm: 18,
    phases: [
      "ငါစား၍ အိပ်ပါတယ်။",
      "ဟုတ်တယ်၊ မှန်တယ်၊ ကောင်းတယ်။",
    ],
  }),

  my({
    number: 3,
    title: "Tone Practice",
    titleMy: "သံ လေ့ကျင့်ခန်း",
    description: "Practice tone marks with various syllables.",
    difficulty: "medium",
    estimatedMinutes: 12,
    focus: ["unicode", "tone", "syllable", "accuracy"],
    prerequisites: ["lesson-my-advanced-2"],
    minAccuracy: 92,
    minWpm: 20,
    phases: [
      "သား သဲ သလဲ သာဓု သာဓု",
      "ဖြေး ဖြို့ ဖြောက် ဖြေး ဖြို့",
    ],
  }),

  my({
    number: 4,
    title: "Medial Combinations",
    titleMy: "စာလုံးကြို ပေါင်းစပ်",
    description: "Complex medial combinations in words.",
    difficulty: "medium",
    estimatedMinutes: 12,
    focus: ["unicode", "medial", "syllable", "accuracy"],
    prerequisites: ["lesson-my-advanced-3"],
    minAccuracy: 92,
    minWpm: 20,
    phases: [
      "ကျွန်ုပ် မျှော်လင့်",
      "ချည်း ညွှန် ပြုံး",
    ],
  }),

  my({
    number: 5,
    title: "Common Words Level 1",
    titleMy: "အသုံးများသော စကားလုံး (၁)",
    description: "Work and daily life vocabulary.",
    difficulty: "medium",
    estimatedMinutes: 12,
    focus: ["words", "unicode", "syllable"],
    prerequisites: ["lesson-my-advanced-4"],
    minAccuracy: 92,
    minWpm: 20,
    phases: [
      "လုပ်ငန်း စီးပွားရေး အကောင့်",
      "သငယ် စာတွေ ဖုန်း",
    ],
  }),

  my({
    number: 6,
    title: "Meeting Vocabulary",
    titleMy: "တွေ့ဆုံရေး စကား",
    description: "Meeting and appointment vocabulary.",
    difficulty: "medium",
    estimatedMinutes: 12,
    focus: ["words", "sentences", "unicode"],
    prerequisites: ["lesson-my-advanced-5"],
    minAccuracy: 92,
    minWpm: 22,
    phases: [
      "မနက်ဖြန် အစည်းအဝေးက သုံးနာရီပါ။",
      "အစီရင်ခံစာ အဆင်သင့်ရှိပါတယ်။",
      "ကျေးဇူးပြု၍ အချက်အလက်များ ပေးပါခင်ဗျာ။",
    ],
  }),

  my({
    number: 7,
    title: "Address and Place",
    titleMy: "လိပ်စာနှင့် နေရာ",
    description: "Sentences about addresses and locations.",
    difficulty: "medium",
    estimatedMinutes: 12,
    focus: ["sentences", "unicode", "numbers"],
    prerequisites: ["lesson-my-advanced-6"],
    minAccuracy: 92,
    minWpm: 22,
    phases: [
      "ကျွန်တော့်လိပ်စာက ရန်ကုန်မြို့ လမ်း ၃ဝ မှာပါ။",
      "သူတို့နေအိမ်က စျေးနားမှာ ရှိတယ်။",
    ],
  }),

  my({
    number: 8,
    title: "Reporting Sentences",
    titleMy: "သတင်းနှင့် အစီရင်ခံ",
    description: "News and reporting style sentences.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "unicode", "accuracy"],
    prerequisites: ["lesson-my-advanced-7"],
    minAccuracy: 92,
    minWpm: 25,
    phases: [
      "ယခုနှစ်တွင် စားသောက်ကုန် ဈေးနှုန်းများ မြင့်တက်လာသည်။",
      "အစိုးရက ကျောင်းအသစ်များ ဆောက်လုပ်ပေးနေသည်။",
    ],
  }),

  my({
    number: 9,
    title: "Daily News Paragraph",
    titleMy: "နေ့စဉ်သတင်း စာပိုဒ်",
    description: "Type a news-style paragraph.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "unicode", "speed", "accuracy"],
    prerequisites: ["lesson-my-advanced-8"],
    minAccuracy: 92,
    minWpm: 25,
    phases: [
      "မနေ့က ရန်ကုန်တိုင်းဒေသကြီးတွင် မိုးကြီးရွာခဲ့သည်။ လေယာဉ်ခရီးစဉ်အချို့ နှောင့်နှေးခဲ့ရသည်။",
    ],
  }),

  my({
    number: 10,
    title: "Society Paragraph",
    titleMy: "လူမှုဘဝ စာပိုဒ်",
    description: "Type about society and community.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "unicode", "speed", "accuracy"],
    prerequisites: ["lesson-my-advanced-9"],
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "လူငယ်တွေအတွက် စာဖတ်ခြင်း က အရေးကြီးတယ်။ ကျောင်းအုပ်က စာကြည့်တိုက် ဖွင့်တယ်။",
    ],
  }),

  my({
    number: 11,
    title: "Mixed Myanmar + English Words",
    titleMy: "မြန်မာ + အင်္ဂလိပ် ရောနှော",
    description: "Real-world text mixing Myanmar and English words.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["bilingual", "unicode", "sentences"],
    prerequisites: ["lesson-my-advanced-10"],
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "စက်ကိရိယာတွေကို ဆော့ဖ်ဝဲနဲ့ စီမံနိုင်ပါတယ်။",
      "စာတွေကို ကွန်ပျူတာနဲ့ ရိုက်နိုင်ပါတယ်။",
      "ဖိုင်တွေ သိမ်းတဲ့နေရာကို သတိရပါ။",
    ],
  }),

  my({
    number: 12,
    title: "Essay Writing",
    titleMy: "စာစီစာကုံး",
    description: "Type an essay paragraph about education.",
    difficulty: "hard",
    estimatedMinutes: 18,
    focus: ["sentences", "unicode", "speed", "accuracy"],
    prerequisites: ["lesson-my-advanced-11"],
    minAccuracy: 93,
    minWpm: 28,
    phases: [
      "ပညာရေးသည် လူ့ဘဝကို မြှင့်တင်ပေးသည်။ ကောင်းမွန်သော ပညာရေးသည် နိုင်ငံတိုးတက်ရေးအတွက် အခြေခံဖြစ်သည်။",
    ],
  }),

  my({
    number: 13,
    title: "Punctuation Drills",
    titleMy: "အနားသတ် သင်္ကေတ",
    description: "Comma and period in various contexts.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["punctuation", "unicode", "sentences"],
    prerequisites: ["lesson-my-advanced-12"],
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "ဟုတ်တယ်၊ မှန်တယ်၊ ကောင်းတယ်။",
      "ရက်၊ လ၊ ခုနှစ်တွေကို သတိမှတ်ပါ။",
    ],
  }),

  my({
    number: 14,
    title: "Causal Paragraph",
    titleMy: "အကြောင်းကျိုးဆက် စာပိုဒ်",
    description: "Paragraphs with cause-and-effect patterns.",
    difficulty: "hard",
    estimatedMinutes: 18,
    focus: ["sentences", "unicode", "speed", "accuracy"],
    prerequisites: ["lesson-my-advanced-13"],
    minAccuracy: 94,
    minWpm: 28,
    phases: [
      "ရေအလုံအလောက်မရှိသောကြောင့် စိုက်ပျိုးရေး ဒုက္ခရောက်ခဲ့သည်။ ထို့ကြောင့် စပါးစျေးနှုန်း မြင့်တက်လာခဲ့ပါတယ်။",
    ],
  }),

  my({
    number: 15,
    title: "Formal Letter 1",
    titleMy: "တရားဝင် စာ (၁)",
    description: "Formal letter writing style.",
    difficulty: "hard",
    estimatedMinutes: 18,
    focus: ["sentences", "unicode", "accuracy"],
    prerequisites: ["lesson-my-advanced-14"],
    minAccuracy: 94,
    minWpm: 28,
    phases: [
      "ခင်လေးဇာ လေးစားစွာဖြင့် အကြောင်းကြားအပ်ပါသည်။",
      "အသေးစိတ်အချက်အလက်များကို အောက်ပါအတိုင်း ဖော်ပြပါသည်။",
    ],
  }),

  my({
    number: 16,
    title: "Formal Letter 2",
    titleMy: "တရားဝင် စာ (၂)",
    description: "Another formal letter template.",
    difficulty: "hard",
    estimatedMinutes: 18,
    focus: ["sentences", "unicode", "accuracy"],
    prerequisites: ["lesson-my-advanced-15"],
    minAccuracy: 94,
    minWpm: 30,
    phases: [
      "အလုပ်ခွင်ထဲ တစ်ရက် လစာငွေ နှင့် ပတ်သက်ပြီး မေးမြန်းချင်ပါသည်။",
      "ကြင်နာစွာ ဆောင်ရွက်ပေးပါရန် ပန်ကြားပါသည်။",
    ],
  }),

  my({
    number: 17,
    title: "Timed News Paragraph",
    titleMy: "အချိန်ကိုက် သတင်းစာပိုဒ်",
    description: "Type news text quickly and accurately.",
    difficulty: "hard",
    estimatedMinutes: 20,
    focus: ["speed", "accuracy", "sentences", "unicode"],
    prerequisites: ["lesson-my-advanced-16"],
    minAccuracy: 94,
    minWpm: 30,
    phases: [
      "နိုင်ငံတစ်ဝန်း ငြိမ်းချမ်းရေးအတွက် ပညာရေး စနစ်ကို တိုးတက်အောင် ဆောင်ရွက်ရန် ဆုံးဖြတ်ခဲ့ကြသည်။",
    ],
  }),

  my({
    number: 18,
    title: "Examination Practice",
    titleMy: "စာမေးပွဲ ကြိုတင် လေ့ကျင့်ခန်း",
    description: "Final examination passage for Myanmar.",
    difficulty: "hard",
    estimatedMinutes: 20,
    focus: ["speed", "accuracy", "sentences", "unicode"],
    prerequisites: ["lesson-my-advanced-17"],
    minAccuracy: 95,
    minWpm: 32,
    phases: [
      "ပတ်ဝန်းကျင် ထိန်းသိမ်းရေးကို လူတိုင်း ပါဝင်ကူညီသင့်သည်။ အမှိုက်စနစ်တကျရှင်းခြင်းသည် ရိုးရှင်းသော နည်းလမ်းတစ်ခုဖြစ်သည်။",
      "အချိန်ကိုလေးစားပါ။ စာကိုပုံမှန်လေ့လာပါ။ ကျန်းမာရေးအတွက် အိပ်ရေးဝဝအိပ်ပါ။",
    ],
  }),
];
