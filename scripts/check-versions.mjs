#!/usr/bin/env node
/**
 * check-versions.mjs
 *
 * Validates that the application version is consistent across every location
 * where the desktop framework and installer read it, and that the tag (when
 * provided) matches. This is the single guard that prevents a release from
 * shipping with conflicting versions in the bundle, installer and updater
 * metadata.
 *
 * Authoritative locations:
 *   - package.json          (frontend/build metadata)
 *   - src-tauri/Cargo.toml  (Rust crate version)
 *   - src-tauri/tauri.conf.json (Tauri bundle/version)
 *
 * Usage:
 *   node scripts/check-versions.mjs                 # validate the three files
 *   node scripts/check-versions.mjs --tag v1.0.0    # also require tag == version
 *
 * Exit code 0 on success, 1 on any mismatch or invalid semver.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

function fail(message) {
  console.error(`[check-versions] ERROR: ${message}`);
  process.exitCode = 1;
}

function readJson(relative) {
  return JSON.parse(readFileSync(resolve(root, relative), "utf8"));
}

function readCargoToml(relative) {
  const text = readFileSync(resolve(root, relative), "utf8");
  const m = text.match(/^version\s*=\s*"([^"]+)"/m);
  if (!m) {
    fail(`Cannot parse version from ${relative}`);
    return null;
  }
  return m[1];
}

function normalise(v) {
  return v.startsWith("v") ? v.slice(1) : v;
}

function assertSemver(label, value) {
  if (typeof value !== "string" || !SEMVER.test(value)) {
    fail(`${label} is not a valid semver string: ${JSON.stringify(value)}`);
  }
}

const packageJson = readJson("package.json");
const tauriConf = readJson("src-tauri/tauri.conf.json");
const cargoVersion = readCargoToml("src-tauri/Cargo.toml");

const versions = {
  "package.json": packageJson.version,
  "src-tauri/Cargo.toml": cargoVersion,
  "src-tauri/tauri.conf.json": tauriConf.version,
};

const seen = new Set();
let anyInvalid = false;
for (const [file, version] of Object.entries(versions)) {
  if (version == null) {
    anyInvalid = true;
    continue;
  }
  const bare = normalise(version);
  assertSemver(file, bare);
  if (SEMVER.test(bare)) seen.add(bare);
  else anyInvalid = true;
}

if (seen.size > 1) {
  fail(
    `Version drift detected across files: ${[...seen].join(", ")}\n` +
      `Fix by running: node scripts/set-version.mjs <new-version>`,
  );
  anyInvalid = true;
}

const version = [...seen][0];

const tagIndex = process.argv.indexOf("--tag");
if (tagIndex !== -1) {
  const tag = process.argv[tagIndex + 1];
  if (!tag) {
    fail("--tag requires a value, e.g. --tag v1.0.0");
  } else if (normalise(tag) !== version) {
    fail(`Tag "${tag}" does not match application version "${version}".`);
  }
}

if (anyInvalid) {
  process.exit(1);
}

console.log(`[check-versions] OK — all files agree on ${version}`);
