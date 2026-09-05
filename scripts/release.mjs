#!/usr/bin/env node
/**
 * release.mjs
 *
 * The developer workflow for cutting a release. Safe by default: it never
 * pushes anything without an explicit confirmation (or `--yes`).
 *
 *   node scripts/release.mjs                # release current version as-is
 *   node scripts/release.mjs --next 1.2.0   # bump version, then release it
 *   node scripts/release.mjs --push         # also push the tag (confirms)
 *   node scripts/release.mjs --yes          # skip interactive confirmations
 *
 * Steps:
 *   1. Working tree must be clean (unless --allow-dirty).
 *   2. Writes must target the exact same version everywhere (check-versions).
 *   3. Runs the quality gates: typecheck, lint, tests, frontend build.
 *      (`--skip-checks` bypasses them; `--tauri-build` additionally compiles
 *      and signs the bundles locally so CI is not the first place a broken
 *      bundle is seen.)
 *   4. Creates the annotated tag v<version>.
 *   5. Pushes the tag (only with --push, after confirmation).
 *
 * The tag push triggers .github/workflows/release.yml, which builds, signs,
 * validates and publishes the GitHub Release and updater metadata.
 *
 * Required CI secrets (never local): TAURI_SIGNING_PRIVATE_KEY,
 * TAURI_SIGNING_PRIVATE_KEY_PASSWORD, optional WINDOWS_CERTIFICATE[_PASSWORD].
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  const value = process.argv[i + 1];
  return value !== undefined && !value.startsWith("--") ? value : true;
}

const flags = {
  next: typeof arg("next") === "string" ? arg("next") : null,
  push: process.argv.includes("--push"),
  yes: process.argv.includes("--yes"),
  skipChecks: process.argv.includes("--skip-checks"),
  allowDirty: process.argv.includes("--allow-dirty"),
  tauriBuild: process.argv.includes("--tauri-build"),
};

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: opts.silent ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) fail(`Failed to run ${cmd}: ${result.error.message}`);
  if (!opts.allowFailure && result.status !== 0) {
    fail(`Command failed with exit ${result.status}: ${cmd} ${args.join(" ")}`);
  }
  return result;
}

function confirm(question) {
  if (flags.yes) return true;
  return new Promise((resolvePrompt) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolvePrompt(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

async function main() {
  const gitAvailable = run("git", ["rev-parse", "--git-dir"], { silent: true }).status === 0;
  if (!gitAvailable) fail("Not inside a Git repository — releases are tag-driven.");

  // 1. Clean tree.
  if (!flags.allowDirty) {
    const status = run("git", ["status", "--porcelain"], { silent: true }).stdout.trim();
    if (status.length > 0) {
      fail(
        "Working tree is not clean. Commit or stash changes first, or re-run with --allow-dirty.",
      );
    }
  }

  // 2. Version.
  if (flags.next !== null) {
    if (typeof flags.next !== "string" || !SEMVER.test(flags.next)) {
      fail(`Invalid --next "${flags.next}". Use MAJOR.MINOR.PATCH, e.g. --next 1.2.0`);
    }
    console.log(`[release] Bumping version to ${flags.next}...`);
    run(process.execPath, ["scripts/set-version.mjs", flags.next]);
  }
  run(process.execPath, ["scripts/check-versions.mjs"]);
  const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const tag = `v${version}`;

  const tagExists = run("git", ["tag", "-l", tag], { silent: true }).stdout.trim() === tag;
  if (tagExists) fail(`Tag ${tag} already exists. Delete it first if this is intentional.`);

  console.log(`\n[release] Releasing OneType ${tag}\n`);

  // 3. Quality gates.
  if (!flags.skipChecks) {
    console.log("[release] typecheck ...");
    run("pnpm", ["typecheck"]);
    console.log("[release] lint ...");
    run("pnpm", ["lint"]);
    console.log("[release] tests ...");
    run("pnpm", ["test"]);
    console.log("[release] frontend build ...");
    run("pnpm", ["build"]);
    if (flags.tauriBuild) {
      console.log("[release] tauri build (signing with local key) ...");
      run("pnpm", ["tauri", "build"]);
    }
  } else {
    console.log("[release] --skip-checks: quality gates skipped");
  }

  // 4. Create the tag.
  if (!(await confirm(`Create annotated tag ${tag}?`))) {
    console.log("[release] Aborted — no tag created.");
    process.exit(0);
  }
  run("git", ["tag", "-a", tag, "-m", `OneType ${tag}`]);
  console.log(`[release] Created tag ${tag}`);

  // 5. Push.
  if (flags.push) {
    if (await confirm(`Push ${tag} to origin (triggers the release workflow)?`)) {
      run("git", ["push", "origin", tag]);
      console.log(`[release] Pushed ${tag}. Watch the release at:\n  https://github.com/aungpwint/onetype/actions`);
    } else {
      console.log("[release] Not pushed. The tag is local only.");
    }
  } else {
    console.log(
      `[release] Done. Push the tag when ready:\n\n  git push origin ${tag}\n\n` +
        `This triggers .github/workflows/release.yml.`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});