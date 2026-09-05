#!/usr/bin/env node
/**
 * release-notes.mjs
 *
 * Builds the professional markdown body for a GitHub Release, the same style as
 * a polished open-source desktop application release page:
 *
 *   # OneType v1.1.0
 *   ## What's New
 *   (curated section if provided, then categorised commits since the previous
 *    version tag — conventional-commit prefixes with graceful fallback)
 *   ## Downloads            <- per-platform installer links (auto-scanned)
 *   ## Installation Instructions  <- per platform actually shipped
 *   ## SHA256 Checksums     <- read from checksums.txt (never hand-written)
 *   ## Updater              <- how auto-updates are verified
 *   ## Release Links
 *
 * What's New is derived from `git log` between the previous semver tag and the
 * current HEAD; if Git metadata is unavailable the section is simply omitted
 * rather than failing the release. A maintainer-curated block can be injected
 * with --curated <file>.
 *
 * Usage (called by the release workflow from the repo root):
 *   node scripts/release-notes.mjs \
 *     --version 1.1.0 --tag v1.1.0 \
 *     --owner aungpwint --repo onetype \
 *     --assets-dir dist/updates \
 *     --checksums dist/updates/checksums.txt \
 *     --out dist/release-notes.md
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join, isAbsolute } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(process.cwd());

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) return null;
  return process.argv[i + 1];
}

function fail(message) {
  console.error(`[release-notes] ERROR: ${message}`);
  process.exit(1);
}

function ensure(value, label) {
  if (!value) fail(`${label} is required.`);
  return value;
}

function readOpt(file) {
  if (!file) return "";
  const absolute = isAbsolute(file) ? file : resolve(root, file);
  if (!existsSync(absolute)) {
    fail(`Curated notes file not found: ${absolute}`);
  }
  return readFileSync(absolute, "utf8").trim();
}

function findVersioningTag(output, current) {
  const lines = output.trim().split("\n");
  for (const line of lines) {
    const tag = line.trim();
    if (!tag || tag === `v${current}` || tag === current) continue;
    return tag;
  }
  return null;
}

function categorisedLog(previousTag, currentTag) {
  if (!previousTag) return [];
  try {
    const log = execFileSync(
      "git",
      ["log", "--oneline", "--no-merges", `${previousTag}..${currentTag}`],
      { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    )
      .split(/\r?\n/)
      .filter(Boolean);
    return log.map((line) => line.replace(/^[0-9a-f]{7,40}\s?/, ""));
  } catch {
    return [];
  }
}

const CATEGORIES = [
  { name: "Features", prefixes: ["feat", "feature"] },
  { name: "Bug Fixes", prefixes: ["fix", "bugfix"] },
  { name: "Performance", prefixes: ["perf", "optimiz"] },
  { name: "Refactoring", prefixes: ["refactor", "rework"] },
  { name: "Documentation", prefixes: ["docs", "doc"] },
  { name: "Security", prefixes: ["security", "sec"] },
  { name: "Maintenance", prefixes: ["chore", "build", "ci", "deps"] },
];

function bucketCommit(message) {
  const lower = message.toLowerCase();
  for (const category of CATEGORIES) {
    for (const prefix of category.prefixes) {
      if (lower.startsWith(`${prefix}:`) || lower.startsWith(`${prefix}(`)) {
        return category.name;
      }
    }
  }
  return "Other";
}

function whatsNewMarkdown(commits) {
  const buckets = new Map();
  const order = [];
  for (const commit of commits) {
    const category = bucketCommit(commit);
    if (!buckets.has(category)) {
      buckets.set(category, []);
      order.push(category);
    }
    buckets.get(category).push(commit);
  }
  const sections = [];
  for (const category of order) {
    const items = buckets.get(category).map((c) => `- ${c}`).join("\n");
    sections.push(`\n### ${category}\n\n${items}`);
  }
  return sections.join("");
}

function collectAssets(dir) {
  const absolute = isAbsolute(dir) ? dir : resolve(root, dir);
  if (!existsSync(absolute)) fail(`Assets directory not found: ${absolute}`);
  const entries = readdirSync(absolute)
    .filter((name) => statSync(join(absolute, name)).isFile())
    .sort();
  return {
    dir: absolute,
    names: entries,
    releasesPath: (name) => `https://github.com/${owner}/${repo}/releases/download/${tag}/${encodeURIComponent(name)}`,
  };
}

let owner = arg("owner") || process.env.GITHUB_OWNER || "";
let repo = arg("repo") || process.env.GITHUB_REPO || "";
let tag = arg("tag");
let version = arg("version");

function buildNotes() {
  owner = ensure(owner, "--owner (or GITHUB_OWNER)");
  repo = ensure(repo, "--repo (or GITHUB_REPO)");
  tag = ensure(tag, "--tag");
  version = ensure(version, "--version");
  if (tag !== `v${version}`) {
    fail(`Tag "${tag}" does not match version "${version}" — refusing to build incoherent notes.`);
  }

  const assets = collectAssets(arg("assets-dir"));
  const checksumsPath = arg("checksums");
  const checksumsAbsolute = checksumsPath
    ? (isAbsolute(checksumsPath) ? checksumsPath : resolve(root, checksumsPath))
    : null;
  const checksumsText = checksumsAbsolute && existsSync(checksumsAbsolute)
    ? readFileSync(checksumsAbsolute, "utf8").trim()
    : "";
  const curated = readOpt(arg("curated"));

  // --- What's New ---------------------------------------------------------
  let whatsNew = "";
  if (curated) {
    whatsNew += `\n\n${curated}`;
  }
  let previousTag = null;
  try {
    const tagged = execFileSync(
      "git",
      ["tag", "-l", "v*", "--sort=-version:refname"],
      { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
    );
    previousTag = findVersioningTag(tagged, version);
  } catch {
    previousTag = null;
  }
  const commits = categorisedLog(previousTag, tag);
  if (commits.length > 0) {
    whatsNew += whatsNewMarkdown(commits);
  }
  if (!whatsNew) {
    whatsNew = "\n- See the [commit history](/commits) for this release.";
  }

  // --- Downloads ----------------------------------------------------------
  const byExt = (ext) => assets.names.find((n) => n.endsWith(ext));
  const windows = [byExt(".exe"), byExt(".msi")].filter(Boolean);
  const macos = [byExt(".app.tar.gz"), byExt(".dmg")].filter(Boolean);
  const linux = assets.names.filter((n) => /\.(deb|rpm|AppImage)$/.test(n));
  const checksumAsset = assets.names.find((n) => n === "checksums.txt");
  const latestJson = assets.names.find((n) => n === "latest.json");

  const link = (name) => `- [\`${name}\`](${assets.releasesPath(name)})`;
  const links = (names) => names.map(link).join("\n");

  const downloadLines = [];
  if (windows.length) {
    downloadLines.push(`\n### Windows\n\n${links(windows)}`);
  }
  if (macos.length) {
    downloadLines.push(`\n### macOS (Apple Silicon)\n\n${links(macos)}`);
  }
  if (linux.length) {
    downloadLines.push(`\n### Linux x86_64\n\n${links(linux)}`);
  }
  if (checksumAsset) {
    downloadLines.push(`\n### Verification\n\n${link(checksumAsset)} — SHA256 checksums for every installer.`);
  }
  if (latestJson) {
    downloadLines.push(
      `\n### Auto-update metadata\n\n${link(latestJson)} — signed Tauri updater manifest.\n`,
    );
  }
  const downloads = downloadLines.join("\n");

  // --- Installation Instructions ------------------------------------------
  const installLines = [];
  if (windows.length) {
    installLines.push(`\n### Windows\n\n\`\`\`\n1. Download the Windows installer above.\n2. Run it and follow the installer wizard.\n3. Launch OneType from the Start menu.\n\`\`\``);
  }
  if (macos.length) {
    installLines.push(`\n### macOS\n\n\`\`\`\n1. Download the DMG above.\n2. Open the DMG and drag OneType.app into Applications.\n3. Launch OneType (Gatekeeper: right-click -> Open the first time).\n4. Grant keyboard-access / input permissions if prompted in Settings.\n\`\`\``);
  }
  if (linux.some((n) => n.endsWith(".deb"))) {
    installLines.push(`\n### Debian / Ubuntu\n\n\`\`\`bash\nwget <URL of the .deb above>\nsudo apt install -y ./onetype_${version}_amd64.deb\n\`\`\``);
  }
  if (linux.some((n) => n.endsWith(".rpm"))) {
    installLines.push(`\n### Fedora / RHEL / openSUSE\n\n\`\`\`bash\nwget <URL of the .rpm above>\nsudo rpm -Uvh onetype-${version}-1.x86_64.rpm\n\`\`\``);
  }
  if (linux.some((n) => n.endsWith(".AppImage"))) {
    installLines.push(`\n### AppImage (any distro)\n\n\`\`\`bash\nwget <URL of the .AppImage above>\nchmod +x onetype*.AppImage\n./onetype*.AppImage\n\`\`\``);
  }
  const install = installLines.join("\n");

  // --- Checksums ----------------------------------------------------------
  const checksumsBlock = checksumsText
    ? `\`\`\`\n${checksumsText}\n\`\`\``
    : "_Checksums are published as the `checksums.txt` release asset._";

  // --- Updater ------------------------------------------------------------
  const updaterNote = [
    "Every update is downloaded over HTTPS and verified against the OneType minisign public key",
    "before it is installed; unsigned or tampered payloads are rejected. The app checks automatically",
    "on startup (at most every 6 hours) and on demand from **Settings**.",
  ].join(" ");

  const body = [
    `# OneType ${tag}`,
    ``,
    `Auto-updating typing tutor for English and Myanmar — [changelog](./CHANGELOG.md).`,
    ``,
    `## What's New${whatsNew}`,
    ``,
    `## Downloads${downloads || "\n\n_No download assets attached._"}`,
    ``,
    `## Installation Instructions${install || "\n\n_No platform install instructions._"}`,
    ``,
    `## SHA256 Checksums\n\n${checksumsBlock}`,
    updaterNote ? `\n## Auto-update\n\n${updaterNote}` : "",
    ``,
  ].join("\n");

  const out = arg("out");
  if (!out) fail("--out is required.");
  writeFileSync(isAbsolute(out) ? out : resolve(root, out), body.trimEnd() + "\n");
  console.log(`[release-notes] Wrote release notes -> ${out}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildNotes();
}