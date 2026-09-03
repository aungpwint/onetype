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
    id: `lesson-en-advanced-${seed.number}`,
    level: "advanced",
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

export const englishAdvancedLessons: LessonData[] = [
  en({
    number: 1,
    title: "Weak Key Reinforcement",
    titleMy: "အားနည်းသည့် ကီးများ ပြန်လည်လေ့ကျင့်ခြင်း",
    description: "Drills targeting commonly mistyped keys.",
    difficulty: "medium",
    estimatedMinutes: 12,
    focus: ["finger-control", "accuracy"],
    prerequisites: ["lesson-en-intermediate-18"],
    minAccuracy: 93,
    minWpm: 30,
    phases: [
      "edc rfv tgb edc rfv tgb edc rfv tgb",
      "ki lo ju ki lo ju ki lo ju ki lo ju",
      "pq wx vb pq wx vb pq wx vb pq wx vb",
      "freedom evaluate privilege judgment",
      "knowledge irregular questionnaire",
    ],
  }),

  en({
    number: 2,
    title: "Daily Life Paragraph",
    titleMy: "နေ့စဉ်ဘဝ စာပိုဒ်",
    description: "Type a paragraph about daily life. Focus on smooth flow.",
    difficulty: "medium",
    estimatedMinutes: 12,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-1"],
    minAccuracy: 93,
    minWpm: 30,
    phases: [
      "I wake up at six in the morning and brush my teeth. Then I eat breakfast and take the bus to work. I return home in the evening and watch a little television.",
    ],
  }),

  en({
    number: 3,
    title: "School Life Paragraph",
    titleMy: "ကျောင်းဘဝ စာပိုဒ်",
    description: "Type about school life. Practice capital letters at sentence starts.",
    difficulty: "medium",
    estimatedMinutes: 12,
    focus: ["sentences", "speed", "accuracy", "shift"],
    prerequisites: ["lesson-en-advanced-2"],
    minAccuracy: 93,
    minWpm: 30,
    phases: [
      "Our school has many big and bright classrooms. The teachers are kind and patient. We study English, Math, and Science every day. I enjoy learning new things with my classmates.",
    ],
  }),

  en({
    number: 4,
    title: "Nature Paragraph",
    titleMy: "သဘာဝ စာပိုဒ်",
    description: "Type about nature. Build rhythm and consistency.",
    difficulty: "medium",
    estimatedMinutes: 12,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-3"],
    minAccuracy: 93,
    minWpm: 30,
    phases: [
      "The forest is full of tall green trees and colorful flowers. A clear stream flows between the rocks. Birds sing sweet songs in the early morning. Nature gives us fresh air and calmness.",
    ],
  }),

  en({
    number: 5,
    title: "Technology Paragraph",
    titleMy: "နည်းပညာ စာပိုဒ်",
    description: "Type about technology. Practice words with varied letter patterns.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-4"],
    minAccuracy: 93,
    minWpm: 32,
    phases: [
      "Computers and phones connect people around the world in seconds. We can learn, work, and shop using the internet. It is important to use technology wisely and not spend the whole day on a screen.",
    ],
  }),

  en({
    number: 6,
    title: "Good Habits Paragraph",
    titleMy: "ကောင်းသည့် အလေ့အကျင့် စာပိုဒ်",
    description: "Type about building good habits.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-5"],
    minAccuracy: 93,
    minWpm: 32,
    phases: [
      "Good habits start with small steps. If you read a little every day, you will read many books in a year. If you practice typing daily, your speed and accuracy will grow quickly. Keep going and never give up.",
    ],
  }),

  en({
    number: 7,
    title: "A Short Story",
    titleMy: "အတိုဇာတ်လမ်း",
    description: "Type a short story with dialogue and description.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "punctuation", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-6"],
    minAccuracy: 93,
    minWpm: 32,
    phases: [
      "One evening, Sam could not find his house key. He searched the bag and the pocket many times. At last he saw the key hanging on the door. He laughed at his own mistake and walked inside.",
    ],
  }),

  en({
    number: 8,
    title: "Travel Writing",
    titleMy: "ခရီးသွား စာပိုဒ်",
    description: "Type about travel. Practice varied sentence structures.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-7"],
    minAccuracy: 94,
    minWpm: 33,
    phases: [
      "Traveling opens our eyes to new places and cultures. We meet friendly people, taste new food, and hear different languages. Each journey teaches us something that no classroom can show us.",
    ],
  }),

  en({
    number: 9,
    title: "Persuasive Writing",
    titleMy: "ဟောပြောချက် စာပိုဒ်",
    description: "Type a persuasive paragraph. Practice varied vocabulary.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-8"],
    minAccuracy: 94,
    minWpm: 33,
    phases: [
      "Everyone should learn to save drinking water. Clean water is a precious gift. When we close the tap and fix small leaks, we protect rivers and lakes for the future. Small actions create a big difference.",
    ],
  }),

  en({
    number: 10,
    title: "Descriptive Writing",
    titleMy: "ဖော်ပြချက် စာပိုဒ်",
    description: "Type a descriptive paragraph with rich vocabulary.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-9"],
    minAccuracy: 94,
    minWpm: 33,
    phases: [
      "The sunset turned the sky into a sea of orange and pink. Long shadows stretched across the quiet field. A cool breeze carried the smell of fresh grass while the first little star began to shine.",
    ],
  }),

  en({
    number: 11,
    title: "Explanatory Writing",
    titleMy: "ရှင်းလင်းဖော်ပြချက် စာပိုဒ်",
    description: "Type an explanatory paragraph about a process.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-10"],
    minAccuracy: 94,
    minWpm: 33,
    phases: [
      "To grow a plant, first put some soil in a pot. Next, plant a seed and cover it lightly. Then water it a little every day. Finally, place the pot near sunlight and wait for the seed to sprout.",
    ],
  }),

  en({
    number: 12,
    title: "Narrative Writing",
    titleMy: "ဇာတ်လမ်း စာပိုဒ်",
    description: "Type a narrative paragraph with past tense verbs.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-11"],
    minAccuracy: 94,
    minWpm: 34,
    phases: [
      "Last summer, my family visited a small town by the sea. We woke up early to watch the fishermen pull in their boats. I collected bright shells on the sand. It was the happiest day of my year.",
    ],
  }),

  en({
    number: 13,
    title: "Speed Drill: Common Patterns",
    titleMy: "အရှိန်လေ့ကျင့်ခန်း - အသုံးများ ပုံစံ",
    description: "Repeated common English patterns for speed building.",
    difficulty: "hard",
    estimatedMinutes: 12,
    focus: ["speed", "finger-control"],
    prerequisites: ["lesson-en-advanced-12"],
    minAccuracy: 94,
    minWpm: 34,
    phases: [
      "the the the and and and that that that",
      "ing ing ing tion tion tion ed ed ed",
      "the and that have with from this they",
      "will can would could should may might",
      "very much many such just also each every",
    ],
  }),

  en({
    number: 14,
    title: "Accuracy Challenge",
    titleMy: "တိကျမှု စိန်ခေါ်မှု",
    description: "Type complex text with precision. No errors allowed.",
    difficulty: "hard",
    estimatedMinutes: 15,
    focus: ["accuracy", "sentences"],
    prerequisites: ["lesson-en-advanced-13"],
    minAccuracy: 95,
    minWpm: 34,
    phases: [
      "The equilibrium between progress and preservation requires careful judgment. Administrative procedures demand attention to extraordinary details that many people frequently overlook.",
      "Manufacturing processes must comply with environmental regulations. Pharmaceutical companies conduct thorough investigation before commercializing revolutionary treatment methodologies.",
    ],
  }),

  en({
    number: 15,
    title: "Essay Passage: Learning",
    titleMy: "စာစီစာကုံး: သင်ယူခြင်း",
    description: "Type a longer essay passage about learning.",
    difficulty: "hard",
    estimatedMinutes: 18,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-14"],
    minAccuracy: 95,
    minWpm: 34,
    phases: [
      "Learning is a lifelong journey that begins at birth and continues until the end of life. Every skill we master, from reading a book to typing a letter, opens a new door. The best learners stay curious and never fear mistakes, because mistakes are the footprints on the road to mastery.",
    ],
  }),

  en({
    number: 16,
    title: "Essay Passage: Community",
    titleMy: "စာစီစာကုံး: လူ့အဖွဲ့အစည်း",
    description: "Type a longer essay passage about community.",
    difficulty: "hard",
    estimatedMinutes: 18,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-15"],
    minAccuracy: 95,
    minWpm: 34,
    phases: [
      "A community is a group of people who help and support one another. When someone is sick, the neighbors offer food and care. When it rains, they share umbrellas. A strong community makes life safer, warmer, and more joyful for every person who belongs to it.",
    ],
  }),

  en({
    number: 17,
    title: "Long Copy: Library",
    titleMy: "ရှည်လျားသည့် စာပိုဒ်: စာကြည့်တိုက်",
    description: "Extended passage for building typing stamina.",
    difficulty: "hard",
    estimatedMinutes: 20,
    focus: ["sentences", "speed", "accuracy"],
    prerequisites: ["lesson-en-advanced-16"],
    minAccuracy: 95,
    minWpm: 35,
    phases: [
      "The library stands at the heart of our town like a quiet guardian of stories. Its tall shelves hold books of every color, some old with yellow pages and others brand new. On rainy afternoons, children gather there to read, and the only sound is the turning of pages and the soft rain on the roof.",
    ],
  }),

  en({
    number: 18,
    title: "Final Examination",
    titleMy: "နောက်ဆုံး စမ်းသုံး",
    description: "Final exam passage. Demonstrate mastery of touch typing.",
    difficulty: "hard",
    estimatedMinutes: 20,
    focus: ["speed", "accuracy", "sentences"],
    prerequisites: ["lesson-en-advanced-17"],
    minAccuracy: 95,
    minWpm: 36,
    phases: [
      "Success is not built in a single day. It is the sum of many small, honest efforts repeated with care. A writer practices every page, a runner trains every mile, and a typist trains every key. Now that you have reached this lesson, you have already learned the most important secret: steady daily practice turns a beginner into an expert.",
    ],
  }),
];
