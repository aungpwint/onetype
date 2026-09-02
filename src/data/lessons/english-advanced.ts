import type { Difficulty } from "../../types";
import type { LessonData } from "../curriculum/types";

interface LessonSeed {
  number: number;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  focusKeys?: string[];
  minAccuracy: number;
  minWpm: number | null;
  phases: string[];
}

function english(seed: LessonSeed): LessonData {
  return {
    id: `lesson-en-advanced-${seed.number}`,
    level: "advanced",
    number: seed.number,
    title: seed.title,
    titleMy: seed.title,
    description: seed.description,
    difficulty: seed.difficulty,
    estimatedMinutes: seed.estimatedMinutes,
    language: "english",
    layoutId: "english-qwerty",
    completion: { minAccuracy: seed.minAccuracy, minWpm: seed.minWpm },
    focusKeys: seed.focusKeys,
    phases: seed.phases.map((text) => ({ instruction: text, text })),
  };
}

export const englishAdvancedLessons: LessonData[] = [
  english({
    number: 1,
    title: "Daily Life",
    description: "A paragraph about a daily routine.",
    difficulty: "medium",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 30,
    phases: [
      "I wake up at six in the morning and brush my teeth. Then I eat breakfast and take the bus to work. I return home in the evening and watch a little television.",
    ],
  }),
  english({
    number: 2,
    title: "School Life",
    description: "A paragraph about school.",
    difficulty: "medium",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 30,
    phases: [
      "Our school has many big and bright classrooms. The teachers are kind and patient. We study English, Math, and Science every day. I enjoy learning new things with my classmates.",
    ],
  }),
  english({
    number: 3,
    title: "Nature",
    description: "A paragraph about the beauty of nature.",
    difficulty: "medium",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 30,
    phases: [
      "The forest is full of tall green trees and colorful flowers. A clear stream flows between the rocks. Birds sing sweet songs in the early morning. Nature gives us fresh air and calmness.",
    ],
  }),
  english({
    number: 4,
    title: "Food and Health",
    description: "A paragraph about healthy eating.",
    difficulty: "medium",
    estimatedMinutes: 12,
    minAccuracy: 92,
    minWpm: 30,
    phases: [
      "Eating fresh fruits and vegetables keeps our body strong. We should drink plenty of water and avoid too much sugar. A healthy diet helps us to study and work with energy and a clear mind.",
    ],
  }),
  english({
    number: 5,
    title: "Technology",
    description: "A paragraph about modern technology.",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 93,
    minWpm: 32,
    phases: [
      "Computers and phones connect people around the world in seconds. We can learn, work, and shop using the internet. It is important to use technology wisely and not spend the whole day on a screen.",
    ],
  }),
  english({
    number: 6,
    title: "A Good Habit",
    description: "A paragraph about building good habits.",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 93,
    minWpm: 32,
    phases: [
      "Good habits start with small steps. If you read a little every day, you will read many books in a year. If you practice typing daily, your speed and accuracy will grow quickly. Keep going and never give up.",
    ],
  }),
  english({
    number: 7,
    title: "A Story: The Lost Key",
    description: "A short story to type.",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 93,
    minWpm: 32,
    phases: [
      "One evening, Sam could not find his house key. He searched the bag and the pocket many times. At last he saw the key hanging on the door. He laughed at his own mistake and walked inside.",
    ],
  }),
  english({
    number: 8,
    title: "A Story: The Old Bridge",
    description: "A short paragraph about a bridge.",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 93,
    minWpm: 32,
    phases: [
      "The old bridge crosses the wide river between the two towns. Every morning the villagers cross it with baskets of fresh fruit. People say the bridge has stood there for more than a hundred years.",
    ],
  }),
  english({
    number: 9,
    title: "Travel Writing",
    description: "Writing about travel.",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 94,
    minWpm: 33,
    phases: [
      "Traveling opens our eyes to new places and cultures. We meet friendly people, taste new food, and hear different languages. Each journey teaches us something that no classroom can show us.",
    ],
  }),
  english({
    number: 10,
    title: "Persuasive Writing",
    description: "A short persuasive paragraph.",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 94,
    minWpm: 33,
    phases: [
      "Everyone should learn to save drinking water. Clean water is a precious gift. When we close the tap and fix small leaks, we protect rivers and lakes for the future. Small actions create a big difference.",
    ],
  }),
  english({
    number: 11,
    title: "Descriptive Writing",
    description: "A descriptive paragraph.",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 94,
    minWpm: 33,
    phases: [
      "The sunset turned the sky into a sea of orange and pink. Long shadows stretched across the quiet field. A cool breeze carried the smell of fresh grass while the first little star began to shine.",
    ],
  }),
  english({
    number: 12,
    title: "Explanatory Writing",
    description: "Explain a simple process.",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 94,
    minWpm: 33,
    phases: [
      "To grow a plant, first put some soil in a pot. Next, plant a seed and cover it lightly. Then water it a little every day. Finally, place the pot near sunlight and wait for the seed to sprout.",
    ],
  }),
  english({
    number: 13,
    title: "Narrative Writing",
    description: "A short narrative paragraph.",
    difficulty: "hard",
    estimatedMinutes: 15,
    minAccuracy: 94,
    minWpm: 34,
    phases: [
      "Last summer, my family visited a small town by the sea. We woke up early to watch the fishermen pull in their boats. I collected bright shells on the sand. It was the happiest day of my year.",
    ],
  }),
  english({
    number: 14,
    title: "Essay Passage 1",
    description: "A passage about learning.",
    difficulty: "hard",
    estimatedMinutes: 18,
    minAccuracy: 95,
    minWpm: 34,
    phases: [
      "Learning is a lifelong journey that begins at birth and continues until the end of life. Every skill we master, from reading a book to typing a letter, opens a new door. The best learners stay curious and never fear mistakes, because mistakes are the footprints on the road to mastery.",
    ],
  }),
  english({
    number: 15,
    title: "Essay Passage 2",
    description: "A passage about community.",
    difficulty: "hard",
    estimatedMinutes: 18,
    minAccuracy: 95,
    minWpm: 34,
    phases: [
      "A community is a group of people who help and support one another. When someone is sick, the neighbors offer food and care. When it rains, they share umbrellas. A strong community makes life safer, warmer, and more joyful for every person who belongs to it.",
    ],
  }),
  english({
    number: 16,
    title: "Long Copy 1",
    description: "A longer text for stamina.",
    difficulty: "hard",
    estimatedMinutes: 20,
    minAccuracy: 95,
    minWpm: 35,
    phases: [
      "The library stands at the heart of our town like a quiet guardian of stories. Its tall shelves hold books of every color, some old with yellow pages and others brand new. On rainy afternoons, children gather there to read, and the only sound is the turning of pages and the soft rain on the roof.",
    ],
  }),
  english({
    number: 17,
    title: "Long Copy 2",
    description: "Another longer text for practice.",
    difficulty: "hard",
    estimatedMinutes: 20,
    minAccuracy: 95,
    minWpm: 35,
    phases: [
      "Patience is a gentle strength that grows inside us over time. It teaches us to wait without anger and to work without hurry. Gardens are the best teachers of patience. You plant a tiny seed today, and you do not see the fruit tomorrow. You water it and watch it, until one bright morning it blooms.",
    ],
  }),
  english({
    number: 18,
    title: "Examination Practice",
    description: "Final long review passage.",
    difficulty: "hard",
    estimatedMinutes: 20,
    minAccuracy: 95,
    minWpm: 36,
    phases: [
      "Success is not built in a single day. It is the sum of many small, honest efforts repeated with care. A writer practices every page, a runner trains every mile, and a typist trains every key. Now that you have reached this lesson, you have already learned the most important secret: steady daily practice turns a beginner into an expert.",
    ],
  }),
];