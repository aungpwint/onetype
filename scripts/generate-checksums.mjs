#!/usr/bin/env node
/**
 * generate-checksums.mjs
 *
 * Generates (or verifies) `checksums.txt` — the SHA256 manifest published with
 * every release so users can verify the integrity of downloaded installers.
 *
 * Only *distributable binaries* are hashed (installers / updater payloads,
 * e.g. .exe .msi .dmg .app.tar.gz .AppImage .deb .rpm). Updater `.sig` files
 * are excluded on purpose: they are verified through the minisign key, not
 * SHA256, and mixing the two verification models in one file invites mistakes.
 *
 * Output format (normalised, deterministic, easy to diff):
 *     <lowercase-hex-sha256>  <relative-filename>
 * one entry per line, sorted by filename.
 *
 * Modes:
 *
 *   generate (default) — hash every distributable binary in a directory and
 *     write checksums.txt in the same directory:
 *
 *       node scripts/generate-checksums.mjs --dir dist/updates
 *
 *   verify — recompute hashes for every file listed in checksums.txt and fail
 *     (exit 1) if any file is missing or any hash mismatches:
 *
 *       node scripts/generate-checksums.mjs --verify --dir dist/updates
 *
 * The release workflow runs `generate` after merging latest.json and fails the
 * pipeline if any expected artifact has no checksum, so a release can never go
 * out without verified checksums.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DISTRIBUTABLE_EXTENSIONS = new Set([
  ".exe",
  ".msi",
  ".dmg",
  ".app.tar.gz",
  ".AppImage",
  ".deb",
  ".rpm",
]);

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) return null;
  return process.argv[i + 1];
}

function fail(message) {
  console.error(`[checksums] ERROR: ${message}`);
  process.exit(1);
}

function sha256File(absolute) {
  const hash = createHash("sha256");
  // Streaming keeps memory flat even for multi-GB installers.
  hash.update(readFileSync(absolute));
  return hash.digest("hex");
}

function isDistributable(name) {
  for (const ext of DISTRIBUTABLE_EXTENSIONS) {
    if (name.endsWith(ext)) return true;
  }
  return false;
}

export function computeChecksums(dir) {
  const names = readdirSync(dir)
    .filter((name) => isDistributable(name))
    .sort();
  const lines = [];
  for (const name of names) {
    const absolute = join(dir, name);
    if (!existsSync(absolute)) continue; // guard against TOCTOU on CI
    const stat = readFileSync(absolute);
    if (stat.length === 0) {
      fail(`Refusing to checksum zero-byte artifact ${name}`);
    }
    const hex = createHash("sha256").update(stat).digest("hex");
    lines.push(`${hex}  ${name}`);
  }
  return lines;
}

export function verifyChecksums(dir) {
  const checksumPath = join(dir, "checksums.txt");
  if (!existsSync(checksumPath)) {
    fail(`No ${checksumPath} found to verify.`);
  }
  const lines = readFileSync(checksumPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    fail(`checksums.txt is empty — refusing to treat an empty manifest as verified.`);
  }

  const failures = [];
  for (const line of lines) {
    const match = line.match(/^([0-9a-f]{64})\s+(.+)$/);
    if (!match) {
      failures.push(`Malformed checksums.txt line: "${line}"`);
      continue;
    }
    const [, expected, name] = match;
    const absolute = join(dir, name);
    if (!existsSync(absolute)) {
      failures.push(`File listed in checksums.txt is missing: ${name}`);
      continue;
    }
    const actual = createHash("sha256").update(readFileSync(absolute)).digest("hex");
    if (actual !== expected) {
      failures.push(`SHA256 mismatch for ${name}\n  expected ${expected}\n  actual   ${actual}`);
    }
  }

  // Every distributable binary in the directory must be covered.
  for (const name of readdirSync(dir).filter((n) => isDistributable(n)).sort()) {
    let listed = false;
    for (const line of lines) {
      if (line.includes(`  ${name}`)) listed = true;
    }
    if (!listed) {
      failures.push(`Distributable artifact has no checksum entry: ${name}`);
    }
  }

  if (failures.length > 0) {
    console.error(`[checksums] ERROR: checksum verification failed for ${dir}`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`[checksums] OK — ${lines.length} artifact(s) verified in ${dir}`);
  return true;
}

function resolveDir(value) {
  if (!value) fail("--dir is required.");
  const absolute = isAbsolute(value) ? value : resolve(process.cwd(), value);
  if (!existsSync(absolute)) fail(`Directory not found: ${absolute}`);
  return absolute;
}

function run() {
  if (process.argv.includes("--verify")) {
    verifyChecksums(resolveDir(arg("dir")));
    return;
  }
  const dir = resolveDir(arg("dir"));
  const lines = computeChecksums(dir);
  const out = join(dir, "checksums.txt");
  writeFileSync(out, lines.length === 0 ? "" : lines.join("\n") + "\n");
  console.log(`[checksums] Wrote ${lines.length} checksum(s) -> ${out}`);
}

// Keep this module importable for tests/other scripts while still exposing a
// CLI when executed directly.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}