#!/usr/bin/env node
/**
 * set-version.mjs
 *
 * Single command to bump the application version consistently across every
 * place the Tauri framework, installer and updater read it, so developers
 * never have to hand-edit the same value in multiple files.
 *
 * Updates:
 *   - package.json             ("version")
 *   - src-tauri/Cargo.toml     ([package] version)
 *   - src-tauri/tauri.conf.json (top-level "version")
 *
 * Usage:
 *   node scripts/set-version.mjs 1.1.0
 *
 * The version must be valid semver (MAJOR.MINOR.PATCH, no leading "v").
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

const next = process.argv[2];
if (!next) {
  console.error("Usage: node scripts/set-version.mjs <MAJOR.MINOR.PATCH>");
  process.exit(1);
}
if (!SEMVER.test(next)) {
  console.error(`Invalid version "${next}". Use MAJOR.MINOR.PATCH, e.g. 1.1.0`);
  process.exit(1);
}

// package.json — preserve exact formatting, only swap the "version" value.
const pkgPath = resolve(root, "package.json");
const pkg = readFileSync(pkgPath, "utf8");
writeFileSync(
  pkgPath,
  pkg.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`),
);

// Cargo.toml — rewrite [package] version line, preserving everything else.
const cargoPath = resolve(root, "src-tauri/Cargo.toml");
writeFileSync(
  cargoPath,
  readFileSync(cargoPath, "utf8").replace(
    /^version\s*=\s*"[^"]+"/m,
    `version = "${next}"`,
  ),
);

// tauri.conf.json — swap top-level version, preserving formatting.
const confPath = resolve(root, "src-tauri/tauri.conf.json");
const conf = readFileSync(confPath, "utf8");
writeFileSync(
  confPath,
  conf.replace(/(^\s*"version"\s*:\s*")[^"]+(")/m, `$1${next}$2`),
);

console.log(`[set-version] Bumped app version to ${next} across all config files.`);

// Verify.
const { execFileSync } = await import("node:child_process");
try {
  execFileSync(process.execPath, [resolve(root, "scripts/check-versions.mjs")], {
    stdio: "inherit",
    cwd: root,
  });
} catch {
  process.exit(1);
}
