#!/usr/bin/env node
/**
 * generate-latest-json.mjs
 *
 * Generates the Tauri updater manifest (`latest.json`) that the app's updater
 * endpoint (https://github.com/aungpwint/onetype/releases/latest/download/latest.json)
 * points at. Nothing in this repo publishes a release without one, because
 * without `latest.json` the in-app auto-updater has nothing to compare against.
 *
 * Tauri's `tauri build` emits a signed installer plus a matching `.sig`
 * (a base64-encoded minisign detached signature). This script stitches those
 * signatures and installer URLs into the platform map Tauri expects.
 *
 * Two modes:
 *
 *   1. PARTIAL (one per CI matrix platform). Emits a JSON object whose
 *      "platforms" map contains only the current platform:
 *
 *        node scripts/generate-latest-json.mjs --partial \
 *            --target windows-x86_64 \
 *            --url <download-url-of-installer> \
 *            --sig-file <path-to.sig> \
 *            --out dist/updates/partial-windows-x86_64.json
 *
 *   2. MERGE (single, after all matrix builds upload their partials). Reads
 *      every partial file and masks them into one complete latest.json:
 *
 *        node scripts/generate-latest-json.mjs --merge \
 *            --version 1.1.0 \
 *            --pub-date <RFC3339 datestring> \
 *            --notes <release-notes> \
 *            --partials dist/updates/partial-*.json \
 *            --out dist/updates/latest.json
 *
 * The `version` must already have passed `scripts/check-versions.mjs`.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Tauri platform key -> the kind of updater artifact we serve for it.
const PLATFORM_KEYS = new Set([
  "windows-x86_64",
  "windows-aarch64",
  "darwin-x86_64",
  "darwin-aarch64",
  "linux-x86_64",
  "linux-aarch64",
]);

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) return null;
  return process.argv[i + 1];
}

function fail(message) {
  console.error(`[latest-json] ERROR: ${message}`);
  process.exit(1);
}

function readSigFile(path) {
  if (!path) fail("--sig-file is required for --partial mode.");
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) fail(`Signature file not found: ${absolute}`);
  // The .sig must be embedded verbatim (base64 minisign blob, may span lines).
  return readFileSync(absolute, "utf8").trim();
}

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function modePartial(target, url, sigFile, out) {
  if (!PLATFORM_KEYS.has(target)) {
    fail(`Unknown Tauri platform key "${target}". Expected one of: ${[...PLATFORM_KEYS].join(", ")}`);
  }
  // The .sig is a base64-encoded minisign blob. It must be embedded verbatim,
  // byte-for-byte. JSON.stringify handles any newline escaping for us.
  const signature = readSigFile(sigFile);
  const manifest = {
    platforms: {
      [target]: { signature, url },
    },
  };
  ensureDir(out);
  writeFileSync(out, JSON.stringify(manifest, null, 2));
  console.log(`[latest-json] Wrote partial manifest for ${target} -> ${out}`);
}

function modeMerge(version, pubDate, notes, partialGlob, out) {
  if (!version) fail("--version is required for --merge mode.");
  if (!pubDate) fail("--pub-date is required for --merge mode.");
  const partialPaths = partialGlob
    ? partialGlob.split(argsDelimiter())
    : [];
  if (partialPaths.length === 0) fail("--partials must list at least one partial file.");

  const combined = { version, pub_date: pubDate, notes: notes || "", platforms: {} };
  for (const p of partialPaths) {
    const absolute = resolve(root, p);
    if (!existsSync(absolute)) fail(`Partial manifest not found: ${absolute}`);
    const partial = JSON.parse(readFileSync(absolute, "utf8"));
    for (const [key, value] of Object.entries(partial.platforms || {})) {
      if (combined.platforms[key]) {
        fail(`Duplicate platform "${key}" in partials — refusing to guess.`);
      }
      combined.platforms[key] = value;
    }
  }

  if (Object.keys(combined.platforms).length === 0) {
    fail("No platforms were collected; refusing to write an empty manifest.");
  }

  ensureDir(out);
  writeFileSync(out, JSON.stringify(combined, null, 2));
  console.log(`[latest-json] Wrote ${Object.keys(combined.platforms).length} platform(s) -> ${out}`);
}

function argsDelimiter() {
  // Partials are passed as a single whitespace-separated value (handy on CI).
  return /\s+/;
}

const mode = process.argv.includes("--partial")
  ? "partial"
  : process.argv.includes("--merge")
    ? "merge"
    : null;

if (mode === "partial") {
  modePartial(arg("target"), arg("url"), arg("sig-file"), arg("out"));
} else if (mode === "merge") {
  modeMerge(arg("version"), arg("pub-date"), arg("notes"), arg("partials"), arg("out"));
} else {
  fail("Specify either --partial or --merge (see header comments).");
}
