#!/usr/bin/env node
/**
 * validate-release.mjs
 *
 * Pre-publish gate: verifies every rule that must hold before a GitHub Release
 * is created, so a broken or incomplete release is never published. Run in the
 * publish stage of the release workflow after all bundles and latest.json have
 * been merged and checksums generated.
 *
 * Checks performed (exit 1 with a specific message on the first failure):
 *   1. The assets directory contains at least one distributable installer.
 *   2. Every distributable binary's filename contains the released version
 *      (catches stray files from earlier versions, e.g. a 1.0.0 artifact
 *      leaking into the v1.0.1 release).
 *   3. No artifact is zero bytes.
 *   4. checksums.txt exists and covers every distributable binary, and the
 *      hashes actually match the files on disk.
 *   5. latest.json exists, its version equals the released version, carries at
 *      least one platform entry, and every platform URL points at a file that
 *      is present and checksummed in the assets directory.
 *   6. Every updater `.sig` references an artifact that exists (so the app can
 *      always verify what it downloads).
 *
 * Usage:
 *   node scripts/validate-release.mjs \
 *     --dir dist/updates \
 *     --version 1.1.0 \
 *     --tag v1.1.0 \
 *     --latest-json dist/updates/latest.json
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, isAbsolute, basename } from "node:path";
import { verifyChecksums } from "./generate-checksums.mjs";
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
const UPDATER_SIG_SUFFIX = ".sig";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) return null;
  return process.argv[i + 1];
}

function fail(message) {
  console.error(`[validate-release] ERROR: ${message}`);
  process.exit(1);
}

function isDistributable(name) {
  for (const ext of DISTRIBUTABLE_EXTENSIONS) {
    if (name.endsWith(ext)) return true;
  }
  return false;
}

function containsVersionInName(name, version) {
  // The version must appear as a whole token (bounded by separator chars), so
  // "1.0.1" inside "script-1.0.100-fix" does not falsely satisfy a 1.0.1 check.
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[._-])${escaped}(?:[._-]|$)`).test(name);
}

function locate(pathValue, label) {
  if (!pathValue) fail(`${label} is required.`);
  const absolute = isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue);
  if (!existsSync(absolute)) fail(`${label} not found: ${absolute}`);
  return absolute;
}

function validateRelease(options) {
  const { version, tag, dir, latestJsonPath } = options;
  const assetPath = typeof dir === "string" && isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
  if (!existsSync(assetPath)) fail(`Assets directory not found: ${assetPath}`);

  const files = readdirSync(assetPath).sort();
  const distributables = files.filter(isDistributable);
  const sigs = files.filter((f) => f.endsWith(UPDATER_SIG_SUFFIX));

  if (distributables.length === 0) {
    fail(`No installers/updater payloads found in ${assetPath} — refusing to publish an empty release.`);
  }

  console.log(`[validate-release] ${distributables.length} distributable artifact(s), ${sigs.length} updater signature(s)`);

  const stat = (f) => statSync(join(assetPath, f));

  for (const f of distributables) {
    const size = stat(f).size;
    if (size === 0) fail(`Produced a zero-byte artifact: ${f}.`);
    if (!containsVersionInName(f, version)) {
      fail(
        `Artifact "${f}" does not contain the released version "${version}" in its filename. ` +
          `Stray artifacts from another version must not ship in the v${version} release.`,
      );
    }
    console.log(`[validate-release] ${f} (${size} bytes, version ${version})`);
  }

  for (const sig of sigs) {
    const target = sig.slice(0, -UPDATER_SIG_SUFFIX.length);
    if (!files.includes(target)) {
      fail(`Updater signature "${sig}" has no matching artifact "${target}".`);
    }
    if (stat(sig).size === 0) fail(`Zero-byte signature file: ${sig}.`);
  }

  // Checksums must be present for every distributable and actually match.
  const checksumPath = join(assetPath, "checksums.txt");
  if (!existsSync(checksumPath)) {
    fail(`Missing ${basename(checksumPath)} — run scripts/generate-checksums.mjs --dir ${dir} first.`);
  }
  const checksumsOk = verifyChecksums(assetPath);
  if (checksumsOk !== true) fail(`Checksum verification failed — see errors above.`);

  // latest.json must be congruent with this tag and its payloads present.
  const manifest = JSON.parse(readFileSync(locate(latestJsonPath, "--latest-json"), "utf8"));
  if (manifest.version !== version) {
    fail(
      `latest.json version "${manifest.version}" does not match released version "${version}".`,
    );
  }
  const platforms = Object.keys(manifest.platforms || {});
  if (platforms.length === 0) {
    fail(`latest.json has no platforms — an empty manifest was merged.`);
  }
  for (const key of platforms) {
    const entry = manifest.platforms[key];
    const fileName = decodeURIComponent(entry.url.split("/").pop() || "");
    if (!files.includes(fileName)) {
      fail(`latest.json platform "${key}" points at "${fileName}" but no such artifact was produced.`);
    }
    if (!distributables.includes(fileName)) {
      fail(`latest.json platform "${key}" points at "${fileName}", which is not a distributable upload.`);
    }
    if (typeof entry.signature !== "string" || entry.signature.length === 0) {
      fail(`latest.json platform "${key}" is missing a signature.`);
    }
  }
  console.log(`[validate-release] latest.json OK — platforms: ${platforms.join(", ")}`);
  console.log(`[validate-release] Release assets valid for ${tag} — safe to publish.`);
}

function run() {
  let version = arg("version");
  if (!version) {
    // Default to the application version so `pnpm validate:release` works
    // from a local checkout without typing the version.
    try {
      version = JSON.parse(
        readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
      ).version;
    } catch {
      fail("Could not read version — pass --version explicitly.");
    }
  }
  const tag = arg("tag") || `v${version}`;
  const dir = arg("dir");
  const latestJsonPath = arg("latest-json") || join(resolve(process.cwd(), dir || ""), "latest.json");
  if (!version) fail("--version is required (e.g. --version 1.1.0).");
  if (!dir) fail("--dir is required (e.g. --dir dist/updates).");
  if (typeof tag !== "string" || !/^v\d+\.\d+\.\d+/.test(tag)) {
    fail(`Invalid tag "${tag}" — expected the form v<version>, e.g. v1.1.0.`);
  }
  validateRelease({ version, tag, dir, latestJsonPath });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}