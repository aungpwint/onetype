// HISTORICAL ONE-SHOT MIGRATION SCRIPT.
//
// Converted the original TypeScript lesson arrays to the canonical JSON lesson
// schema (`src/data/lessons/<lang>/<level>/NNN-slug.json` + lesson-catalog.json)
// and was run once with `node --experimental-strip-types`. The legacy .ts files
// it imported have since been removed: JSON files under `src/data/lessons/**`
// are now the single source of truth, discovered at runtime by the lesson
// loader (src/lib/lessons/lesson-loader.ts). This script is retained for
// provenance only and will not run without the original sources.
//
// Run with:
//   node --experimental-strip-types scripts/migrate-lessons.mjs

import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const lessonsDir = join(projectRoot, "src", "data", "lessons");
const catalogPath = join(projectRoot, "src", "data", "lesson-catalog.json");

const SCHEMA_VERSION = 1;

const LANG_TO_DIR = { english: "en", myanmar: "my" };
const LAYOUT_TO_KEYBOARD = { "english-qwerty": "qwerty", myanmar3: "myanmar3" };

// Import the legacy lesson modules (type stripping at runtime).
const modules = {
  englishBeginner: await import("../src/data/lessons/english-beginner.ts"),
  englishShift: await import("../src/data/lessons/english-shift.ts"),
  englishNumbers: await import("../src/data/lessons/english-numbers.ts"),
  englishIntermediate: await import("../src/data/lessons/english-intermediate.ts"),
  englishAdvanced: await import("../src/data/lessons/english-advanced.ts"),
  myanmarBeginner: await import("../src/data/lessons/myanmar-beginner.ts"),
  myanmarIntermediate: await import("../src/data/lessons/myanmar-intermediate.ts"),
  myanmarAdvanced: await import("../src/data/lessons/myanmar-advanced.ts"),
};

const SOURCE_EXPORTS = [
  ["englishBeginner", "englishBeginnerLessons"],
  ["englishShift", "englishShiftLessons"],
  ["englishNumbers", "englishNumbersLessons"],
  ["englishIntermediate", "englishIntermediateLessons"],
  ["englishAdvanced", "englishAdvancedLessons"],
  ["myanmarBeginner", "myanmarBeginnerLessons"],
  ["myanmarIntermediate", "myanmarIntermediateLessons"],
  ["myanmarAdvanced", "myanmarAdvancedLessons"],
];

function slugify(input, fallback) {
  const base = String(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base.length > 0 ? base : fallback;
}

function toCanonicalLesson(data) {
  if (!LANG_TO_DIR[data.language]) {
    throw new Error(`Unmapped legacy language "${data.language}" for lesson "${data.id}"`);
  }
  if (!LAYOUT_TO_KEYBOARD[data.layoutId]) {
    throw new Error(`Unmapped legacy layoutId "${data.layoutId}" for lesson "${data.id}"`);
  }

  const exercises = data.phases.map((phase, index) => ({
    id: `${data.id}-ex-${index + 1}`,
    kind: "text",
    instruction: phase.instruction,
    text: phase.text,
  }));

  const lesson = {
    schemaVersion: SCHEMA_VERSION,
    id: data.id,
    level: data.level,
    language: LANG_TO_DIR[data.language],
    number: data.number,
    title: data.title,
    titleMy: data.titleMy,
    description: data.description,
    difficulty: data.difficulty,
    estimatedMinutes: data.estimatedMinutes,
    keyboard: LAYOUT_TO_KEYBOARD[data.layoutId],
    completion: { minAccuracy: data.completion.minAccuracy, minWpm: data.completion.minWpm },
    exercises,
  };

  if (data.focusKeys !== undefined) lesson.focusKeys = data.focusKeys;
  if (data.focus !== undefined) lesson.focus = data.focus;
  if (data.targetFingers !== undefined) lesson.targetFingers = data.targetFingers;
  if (data.targetHands !== undefined) lesson.targetHands = data.targetHands;
  if (data.requiresShift !== undefined) lesson.requiresShift = data.requiresShift;
  if (data.prerequisites !== undefined) lesson.prerequisites = data.prerequisites;

  return lesson;
}

// Clean the output tree so stale generated files never linger.
for (const lang of Object.values(LANG_TO_DIR)) {
  for (const level of ["beginner", "intermediate", "advanced"]) {
    const dir = join(lessonsDir, lang, level);
    if (exists(dir)) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
}

function exists(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

const catalog = { schemaVersion: SCHEMA_VERSION, generatedFrom: "src/data/lessons/*.ts", updatedAt: new Date().toISOString(), lessons: [] };

let total = 0;
for (const [moduleName, exportName] of SOURCE_EXPORTS) {
  const sourceLessons = modules[moduleName][exportName];
  if (!Array.isArray(sourceLessons)) {
    throw new Error(`Module "${moduleName}" does not export array "${exportName}"`);
  }
  for (const data of sourceLessons) {
    if (typeof data.number !== "number" || data.number < 1) {
      throw new Error(`Lesson "${data.id}" has no valid number`);
    }
    const languageDir = LANG_TO_DIR[data.language];
    if (!languageDir) throw new Error(`Unmapped language ${data.language}`);
    const dir = join(lessonsDir, languageDir, data.level);
    const number = String(data.number).padStart(3, "0");
    const slug = slugify(data.title, data.id);
    const fileName = `${number}-${slug}.json`;
    const filePath = join(dir, fileName);
    const canonical = toCanonicalLesson(data);
    writeFileSync(filePath, `${JSON.stringify(canonical, null, 2)}\n`, "utf8");
    catalog.lessons.push({
      id: data.id,
      language: canonical.language,
      level: data.level,
      number: data.number,
      file: `${languageDir}/${data.level}/${fileName}`,
    });
    total += 1;
  }
}

catalog.lessons.sort((a, b) => `${a.language}:${a.level}:${String(a.number).padStart(3, "0")}`.localeCompare(`${b.language}:${b.level}:${String(b.number).padStart(3, "0")}`));
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

const files = [lessonsDir, catalogPath].flatMap((scope) => {
  if (scope === lessonsDir) {
    const out = [];
    for (const lang of Object.values(LANG_TO_DIR)) {
      for (const level of ["beginner", "intermediate", "advanced"]) {
        for (const name of readdirSync(join(scope, lang, level))) out.push(join(scope, lang, level, name));
      }
    }
    return out;
  }
  return [scope];
});

console.log(`Wrote ${total} lessons across ${files.filter((f) => f.endsWith(".json")).length} JSON files, catalog at ${catalogPath}.`);