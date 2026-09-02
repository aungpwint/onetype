export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export const ACHIEVEMENT_CATALOG: Record<string, AchievementDefinition> = {
  "first-test": {
    id: "first-test",
    title: "First Steps",
    description: "Complete your first typing session.",
    icon: "✨",
    color: "#10b981",
  },
  "sessions-10": {
    id: "sessions-10",
    title: "Getting Into It",
    description: "Complete 10 typing sessions.",
    icon: "🌱",
    color: "#f59e0b",
  },
  "sessions-100": {
    id: "sessions-100",
    title: "Century Club",
    description: "Complete 100 typing sessions.",
    icon: "🔥",
    color: "#ef4444",
  },
  "lesson-pass": {
    id: "lesson-pass",
    title: "First Lesson Passed",
    description: "Pass your first lesson with the target accuracy and speed.",
    icon: "🎯",
    color: "#3b82f6",
  },
  "wpm-30": {
    id: "wpm-30",
    title: "Cruising",
    description: "Reach 30 WPM on a completed session.",
    icon: "🏃",
    color: "#10b981",
  },
  "wpm-50": {
    id: "wpm-50",
    title: "Racing Up",
    description: "Reach 50 WPM on a completed session.",
    icon: "🚀",
    color: "#8b5cf6",
  },
  "wpm-80": {
    id: "wpm-80",
    title: "Speedster",
    description: "Reach 80 WPM on a completed session.",
    icon: "⚡",
    color: "#f59e0b",
  },
  "wpm-100": {
    id: "wpm-100",
    title: "Lightning Fingers",
    description: "Reach 100 WPM on a completed session.",
    icon: "💨",
    color: "#ef4444",
  },
  "acc-95": {
    id: "acc-95",
    title: "Sharp Shooter",
    description: "Average 95% accuracy or better.",
    icon: "🎯",
    color: "#10b981",
  },
  "acc-99": {
    id: "acc-99",
    title: "Near Perfect",
    description: "Average 99% accuracy or better.",
    icon: "💎",
    color: "#3b82f6",
  },
  "hours-1": {
    id: "hours-1",
    title: "Hour of Practice",
    description: "Accumulate 1 hour of typing time.",
    icon: "⏱️",
    color: "#8b5cf6",
  },
  "hours-10": {
    id: "hours-10",
    title: "Dedicated",
    description: "Accumulate 10 hours of typing time.",
    icon: "🕰️",
    color: "#f59e0b",
  },
  "streak-7": {
    id: "streak-7",
    title: "One Week Straight",
    description: "Type on 7 consecutive days.",
    icon: "📅",
    color: "#10b981",
  },
  "streak-30": {
    id: "streak-30",
    title: "A Month of Practice",
    description: "Type on 30 consecutive days.",
    icon: "🏆",
    color: "#ef4444",
  },
};

export const ACHIEVEMENT_ORDER = Object.keys(ACHIEVEMENT_CATALOG);
