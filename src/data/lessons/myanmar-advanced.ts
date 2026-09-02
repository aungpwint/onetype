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
    phases: toPhases(
      phases.map((p) => ({ kind: "text", instruction: p.instruction, text: p.text })),
    ),
  };
}

export const myanmarAdvancedLessons: LessonData[] = [
  lesson({
    number: 1,
    title: "ဖတ်စာတိုများ ရိုက်ခြင်း",
    titleMy: "စာကြောင်းတိုများ လေ့ကျင့်ခန်း",
    description: "ရှုပ်ထွေးသော ဝါကျများကို မှန်ကန်စွာ ရိုက်ခြင်း",
    difficulty: "easy",
    estimatedMinutes: 10,
    minAccuracy: 90,
    minWpm: 18,
    phases: [
      "စကားကို ဖြေးဖြေးပြောပြီး ကြိုးစားပါ။",
      "လူတိုင်း အမှားလုပ်တတ်တယ်။",
      "ကျောင်းသားတွေ အချိန်မှန်လာကြတယ်။",
    ],
  }),
  lesson({
    number: 2,
    title: "Sentences with ၍ ၑ ၒ",
    titleMy: "သင်္ကေတအက္ခရာ လေ့ကျင့်ခန်း",
    description: "၍ ၑ ၒ စသည့် အသေးစိတ်သင်္ကေတများ",
    difficulty: "easy",
    estimatedMinutes: 10,
    minAccuracy: 90,
    minWpm: 18,
    focusKeys: ["Digit2", "ShiftLeft"],
    phases: [
      "ငါစား၍ အိပ်ပါတယ်။",
      "ဟုတ်တယ်၊ မှန်တယ်၊ ကောင်းတယ်။",
    ],
  }),
  lesson({
    number: 3,
    title: "Tone Practice ဖြေးသော သံ",
    titleMy: "သံတစ်ရာနဲ့ လေ့ကျင့်ခန်း",
    description: "သံတစ်ရာ၊ သံတစ်ဆင့် နှိပ်တတ်အောင်",
    difficulty: "medium",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 20,
    phases: [
      "သား သဲ သလဲ သာဓု သာဓု",
      "ဖြေး ဖြို့ ဖြောက် ဖြေး ဖြို့",
    ],
  }),
  lesson({
    number: 4,
    title: "Medials Drills",
    titleMy: "စာလုံးကြို သင်္ကေတ လေ့ကျင့်ခန်း",
    description: "ျ ြ ွ ှ တစ်ခါတည်း နှိပ်နည်း အလေ့အကျင့်",
    difficulty: "medium",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 20,
    focusKeys: ["KeyS", "KeyJ", "KeyG", "ShiftLeft"],
    phases: [
      "ကျွန်ုပ် ကျွန်ုပ် မျှော်လင့် မျှော်လင့်",
      "ချည်း ချည်း ညွှန် ညွှန် ပြုံး ပြုံး",
    ],
  }),
  lesson({
    number: 5,
    title: "Common Words Level 1",
    titleMy: "အသုံးများသော စကားလုံး (၁)",
    description: "အလုပ်နှင့် နေ့စဉ်ဘဝ စကားလုံးများ",
    difficulty: "medium",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 20,
    phases: [
      "လုပ်ငန်း လုပ်ငန်း စီးပွားရေး စီးပွားရေး အကောင့် အကောင့်",
      "သငယ် သငယ် စာတွေ စာတွေ ဖုန်း ဖုန်း",
    ],
  }),
  lesson({
    number: 6,
    title: "ကညာဖော်စကား (Meeting)",
    titleMy: "တွေ့ဆုံရေး စကား လေ့ကျင့်ခန်း",
    description: "အစည်းအဝေး နှင့် တွေ့ဆုံရေး ဝေါဟာရ",
    difficulty: "medium",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 22,
    phases: [
      "မနက်ဖြန် အစည်းအဝေးက သုံးနာရီပါ။",
      "အစီရင်ခံစာ အဆင်သင့်ရှိပါတယ်။",
      "ကျေးဇူးပြု၍ အချက်အလက်များ ပေးပါခင်ဗျာ။",
    ],
  }),
  lesson({
    number: 7,
    title: "Address & Place",
    titleMy: "လိပ်စာနှင့် နေရာ လေ့ကျင့်ခန်း",
    description: "လိပ်စာ၊ နေရာ ဖော်ပြချက် စာကြောင်းများ",
    difficulty: "medium",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 22,
    phases: [
      "ကျွန်တော့်လိပ်စာက ရန်ကုန်မြို့ လမ်း ၃ဝ မှာပါ။",
      "သူတို့နေအိမ်က စျေးနားမှာ ရှိတယ်။",
    ],
  }),
  lesson({
    number: 8,
    title: "Reporting Sentences",
    titleMy: "သတင်းနှင့် အစီရင်ခံ စာကြောင်းများ",
    description: "သတင်းအစီရင်ခံ စာကြောင်းများကို မြန်မြန်ရိုက်ခြင်း",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 92,
    minWpm: 25,
    phases: [
      "ယခုနှစ်တွင် စားသောက်ကုန် ဈေးနှုန်းများ မြင့်တက်လာသည်။",
      "အစိုးရက ကျောင်းအသစ်များ ဆောက်လုပ်ပေးနေသည်။",
    ],
  }),
  lesson({
    number: 9,
    title: "နေ့စဉ်သတင်း (Daily News)",
    titleMy: "သတင်း စာမျက်နှာတစ်ရှေ့ လေ့ကျင့်ခန်း",
    description: "နေ့စဉ်သတင်း အကြောင်းအချက် စာပိုဒ်များ",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 92,
    minWpm: 25,
    phases: [
      "မနေ့က ရန်ကုန်တိုင်းဒေသကြီးတွင် မိုးကြီးရွာခဲ့သည်။ လေယာဉ်ခရီးစဉ်အချို့ နှောင့်နှေးခဲ့ရသည်။",
    ],
  }),
  lesson({
    number: 10,
    title: "ပတ်ဝန်းကျင်",
    titleMy: "လူမှုဘဝ စာပိုဒ် လေ့ကျင့်ခန်း",
    description: "လူမှုဘဝနှင့် ပတ်ဝန်းကျင် အကြောင်း စာပိုဒ်",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "လူငယ်တွေအတွက် စာဖတ်ခြင်း က အရေးကြီးတယ်။ ကျောင်းအုပ်က စာကြည့်တိုက် ဖွင့်တယ်။",
    ],
  }),
  lesson({
    number: 11,
    title: "Mixed Sentences with English Words",
    titleMy: "အင်္ဂလိပ်+မြန်မာ ရောနှော လေ့ကျင့်ခန်း",
    description: "နည်းပညာစာလုံးများ ရောထားသော ဝါကျများ",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "စက်ကိရိယာတွေကို ဆော့ဖ်ဝဲနဲ့ စီမံနိုင်ပါတယ်။",
      "စာတွေကို ကွန်ပျူတာနဲ့ ရိုက်နိုင်ပါတယ်။",
      "ဖိုင်တွေ သိမ်းတဲ့နေရာကို သတိရပါ။",
    ],
  }),
  lesson({
    number: 12,
    title: "သုတ/ပညာ အရေးအသား",
    titleMy: "စာစီစာကုံး လေ့ကျင့်ခန်း",
    description: "စာစီစာကုံး ရေးသားချက် စာပိုဒ်များ",
    difficulty: "hard",
    estimatedMinutes: 18,
    minAccuracy: 93,
    minWpm: 28,
    phases: [
      "ပညာရေးသည် လူ့ဘဝကို မြှင့်တင်ပေးသည်။ ကောင်းမွန်သော ပညာရေးသည် နိုင်ငံတိုးတက်ရေးအတွက် အခြေခံဖြစ်သည်။",
    ],
  }),
  lesson({
    number: 13,
    title: "Spell Punctuation",
    titleMy: "အနားသတ် သင်္ကေတ လေ့ကျင့်ခန်း",
    description: "၊ ။ နှင့် ဝါစာကိန်းများ ရိုက်ခြင်း",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "ဟုတ်တယ်၊ မှန်တယ်၊ ကောင်းတယ်။",
      "ရက်၊ လ၊ ခုနှစ်တွေကို သတိမှတ်ပါ။",
    ],
  }),
  lesson({
    number: 14,
    title: "ကြောင်းကျိုးဆက် စာပိုဒ်",
    titleMy: "အကြောင်းပြချက် စာပိုဒ်များ",
    description: "အကြောင်းပြချက်၊ အကျိုးဆက် စာပိုဒ်များ",
    difficulty: "hard",
    estimatedMinutes: 18,
    minAccuracy: 94,
    minWpm: 28,
    phases: [
      "ရေအလုံအလောက်မရှိသောကြောင့် စိုက်ပျိုးရေး ဒုက္ခရောက်ခဲ့သည်။ ထို့ကြောင့် စပါးစျေးနှုန်း မြင့်တက်လာခဲ့ပါတယ်။",
    ],
  }),
  lesson({
    number: 15,
    title: "Formal Letter 1",
    titleMy: "တရားဝင် စာများ လေ့ကျင့်ခန်း (၁)",
    description: "တရားဝင်စာရေးသားချက် အသုံးအနှုန်းများ",
    difficulty: "hard",
    estimatedMinutes: 18,
    minAccuracy: 94,
    minWpm: 28,
    phases: [
      "ခင်လေးဇာ လေးစားစွာဖြင့် အကြောင်းကြားအပ်ပါသည်။",
      "အသေးစိတ်အချက်အလက်များကို အောက်ပါအတိုင်း ဖော်ပြပါသည်။",
    ],
  }),
  lesson({
    number: 16,
    title: "Formal Letter 2",
    titleMy: "တရားဝင် စာများ လေ့ကျင့်ခန်း (၂)",
    description: "အကြောင်းကြားစာ နမူနာများ",
    difficulty: "hard",
    estimatedMinutes: 18,
    minAccuracy: 94,
    minWpm: 30,
    phases: [
      "အလုပ်ခွင်ထဲ တစ်ရက် လစာငွေ နှင့် ပတ်သက်ပြီး မေးမြန်းချင်ပါသည်။",
      "ကြင်နာစွာ ဆောင်ရွက်ပေးပါရန် ပန်ကြားပါသည်။",
    ],
  }),
  lesson({
    number: 17,
    title: "Timed News Paragraph",
    titleMy: "အချိန်ကိုက် သတင်းစာပိုဒ်",
    description: "မြန်+မှန်ရေးသားနိုင်ရန် သတင်းစာပိုဒ် အလေ့အကျင့်",
    difficulty: "hard",
    estimatedMinutes: 20,
    minAccuracy: 94,
    minWpm: 30,
    phases: [
      "နိုင်ငံတစ်ဝန်း ငြိမ်းချမ်းရေးအတွက် ပညာရေး စနစ်ကို တိုးတက်အောင် ဆောင်ရွက်ရန် ဆုံးဖြတ်ခဲ့ကြသည်။",
    ],
  }),
  lesson({
    number: 18,
    title: "Examination Practice",
    titleMy: "စာမေးပွဲ ကြိုတင် လေ့ကျင့်ခန်း",
    description: "စာမေးပွဲအဆင့် စာပိုဒ်များ လေ့ကျင့်ခြင်း",
    difficulty: "hard",
    estimatedMinutes: 20,
    minAccuracy: 95,
    minWpm: 32,
    phases: [
      "ပတ်ဝန်းကျင် ထိန်းသိမ်းရေးကို လူတိုင်း ပါဝင်ကူညီသင့်သည်။ အမှိုက်စနစ်တကျရှင်းခြင်းသည် ရိုးရှင်းသော နည်းလမ်းတစ်ခုဖြစ်သည်။",
      "အချိန်ကိုလေးစားပါ။ စာကိုပုံမှန်လေ့လာပါ။ ကျန်းမာရေးအတွက် အိပ်ရေးဝဝအိပ်ပါ။",
    ],
  }),
];