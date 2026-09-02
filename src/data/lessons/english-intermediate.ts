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
    id: `lesson-en-intermediate-${seed.number}`,
    level: "intermediate",
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

export const englishIntermediateLessons: LessonData[] = [
  english({
    number: 1,
    title: "Common Words 1",
    description: "The most used words in English.",
    difficulty: "easy",
    estimatedMinutes: 8,
    minAccuracy: 90,
    minWpm: 18,
    phases: ["the be to of and a in that have I", "it for not on with he as you do at"],
  }),
  english({
    number: 2,
    title: "Common Words 2",
    description: "More high-frequency words.",
    difficulty: "easy",
    estimatedMinutes: 8,
    minAccuracy: 90,
    minWpm: 18,
    phases: ["this but his by from they we say her she or", "an will my one all would there their what so"],
  }),
  english({
    number: 3,
    title: "Word Pairs",
    description: "Common word pairs typed smoothly.",
    difficulty: "easy",
    estimatedMinutes: 8,
    minAccuracy: 90,
    minWpm: 20,
    phases: ["of the in the to the at the from the", "for the and the with the on the", "it is he is she is we are they are"],
  }),
  english({
    number: 4,
    title: "Smooth Sentences 1",
    description: "Very common simple sentences.",
    difficulty: "medium",
    estimatedMinutes: 8,
    minAccuracy: 92,
    minWpm: 20,
    phases: [
      "This is my pen and that is your book.",
      "We go to school every morning by bus.",
      "She has a small dog named Lucky.",
    ],
  }),
  english({
    number: 5,
    title: "Smooth Sentences 2",
    description: "Sentences with common verbs.",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 92,
    minWpm: 22,
    phases: [
      "They play football in the park after school.",
      "I like to read a story before I sleep.",
      "The teacher tells us to keep quiet in class.",
    ],
  }),
  english({
    number: 6,
    title: "Contractions 1",
    description: "Contractions with not and be.",
    difficulty: "medium",
    estimatedMinutes: 8,
    minAccuracy: 92,
    minWpm: null,
    phases: ["do not don't do not don't", "cannot can't will not won't", "I am I'm you are you're it is it's"],
  }),
  english({
    number: 7,
    title: "Contractions 2",
    description: "More contractions.",
    difficulty: "medium",
    estimatedMinutes: 8,
    minAccuracy: 92,
    minWpm: 20,
    phases: [
      "he is he's she has she's we will we'll",
      "I will I'll you have you've they have they've",
      "Let us go. Let's go together now.",
    ],
  }),
  english({
    number: 8,
    title: "Apostrophes",
    description: "Possessives and apostrophe use.",
    difficulty: "medium",
    estimatedMinutes: 8,
    minAccuracy: 92,
    minWpm: 20,
    phases: ["Sam's book Mary's bag the cat's tail", "It's raining and the cloud's very dark"],
  }),
  english({
    number: 9,
    title: "Compound Words",
    description: "Words made of two smaller words.",
    difficulty: "medium",
    estimatedMinutes: 8,
    minAccuracy: 92,
    minWpm: 22,
    phases: ["sunshine rainbow moonlight fireplace", "notebook keyboard laptop bookstore", "football basketball breakfast homework"],
  }),
  english({
    number: 10,
    title: "Short Paragraphs 1",
    description: "Build reading and typing rhythm.",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 92,
    minWpm: 22,
    phases: [
      "It is a warm sunny day. The birds sing in the trees. We sit under a big tree and eat lunch.",
    ],
  }),
  english({
    number: 11,
    title: "Short Paragraphs 2",
    description: "A short story about a cat.",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 92,
    minWpm: 24,
    phases: [
      "The cat sleeps on the soft mat all day. At night it wakes up and walks in the garden. It catches a small mouse.",
    ],
  }),
  english({
    number: 12,
    title: "Question Sentences",
    description: "Typing questions",
    difficulty: "medium",
    estimatedMinutes: 10,
    minAccuracy: 92,
    minWpm: 22,
    phases: [
      "What is your name and where do you live?",
      "How old are you? Do you have a brother?",
      "Why is the sky blue? Who made the light?",
    ],
  }),
  english({
    number: 13,
    title: "Dialogue",
    description: "A simple conversation between friends.",
    difficulty: "hard",
    estimatedMinutes: 12,
    minAccuracy: 93,
    minWpm: 24,
    phases: [
      "Hello, how are you? I am fine, thank you. What did you do yesterday? I played with my friends.",
    ],
  }),
  english({
    number: 14,
    title: "Speed Building 1",
    description: "Type these lines as fast as you can.",
    difficulty: "hard",
    estimatedMinutes: 12,
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "the quick brown fox jumps over the lazy dog again and again",
      "pack my box with five dozen liquor jugs and six glass jars",
    ],
  }),
  english({
    number: 15,
    title: "Speed Building 2",
    description: "Longer copy for speed and accuracy.",
    difficulty: "hard",
    estimatedMinutes: 12,
    minAccuracy: 93,
    minWpm: 25,
    phases: [
      "Every morning the sun rises in the east and makes the sky bright with soft golden light.",
      "We should drink water, eat healthy food, and sleep well to stay strong every day.",
    ],
  }),
];