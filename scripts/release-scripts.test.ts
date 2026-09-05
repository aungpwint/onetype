import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  copyFileSync,
  mkdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checksumsScript = join(root, "scripts/generate-checksums.mjs");
const validateScript = join(root, "scripts/validate-release.mjs");
const notesScript = join(root, "scripts/release-notes.mjs");

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runSync(script: string, ...args: string[]): RunResult {
  const res = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
  return { code: res.status ?? -1, stdout: res.stdout, stderr: res.stderr };
}

const VERSION = "1.2.3";
const SIG = "SWYgeW91IGNhbiByZWFkIHRoaXMsIHRoZSB0aW1lc3RhbXAgaXMgZmluZS4K";

let dir: string;
let assets: string;

const EXE = "OneType_1.2.3_x64-setup.exe";
const DEB = "onetype_1.2.3_amd64.deb";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "onetype-release-"));
  assets = join(dir, "updates");
  mkdirSync(assets);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("generate-checksums.mjs", () => {
  beforeEach(() => {
    writeFileSync(join(assets, EXE), "windows-installer");
    writeFileSync(join(assets, DEB), "linux-package");
    writeFileSync(join(assets, `${EXE}.sig`), SIG);
  });

  it("hashes distributable binaries (not .sig files) into checksums.txt", () => {
    const res = runSync(checksumsScript, "--dir", assets);
    expect(res.code).toBe(0);
    const lines = readFileSync(join(assets, "checksums.txt"), "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines).toContain(`${sha256("linux-package")}  ${DEB}`);
    expect(lines).toContain(`${sha256("windows-installer")}  ${EXE}`);
  });

  it("verifies a true digest successfully after generation", () => {
    runSync(checksumsScript, "--dir", assets);
    const res = runSync(checksumsScript, "--verify", "--dir", assets);
    expect(res.code).toBe(0);
  });

  it("fails verification when a file is tampered with", () => {
    runSync(checksumsScript, "--dir", assets);
    writeFileSync(join(assets, EXE), "tampered-content");
    const res = runSync(checksumsScript, "--verify", "--dir", assets);
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/mismatch/i);
  });

  it("fails verification when a listed file is deleted", () => {
    runSync(checksumsScript, "--dir", assets);
    rmSync(join(assets, DEB));
    const res = runSync(checksumsScript, "--verify", "--dir", assets);
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/missing/i);
  });
});

describe("validate-release.mjs", () => {
  function setUpValid(dir2: string) {
    writeFileSync(join(dir2, EXE), "windows-installer");
    writeFileSync(join(dir2, `${EXE}.sig`), SIG);
    writeFileSync(
      join(dir2, "latest.json"),
      JSON.stringify({
        version: VERSION,
        pub_date: "2026-01-01T00:00:00Z",
        platforms: {
          "windows-x86_64": {
            url: `https://github.com/aungpwint/onetype/releases/download/v${VERSION}/${EXE}`,
            signature: SIG,
          },
        },
      }),
    );
    runSync(checksumsScript, "--dir", dir2);
  }

  function validate(dir2 = assets): RunResult {
    return runSync(
      validateScript,
      "--dir", dir2,
      "--version", VERSION,
      "--tag", `v${VERSION}`,
      "--latest-json", join(dir2, "latest.json"),
    );
  }

  it("passes a complete, correctly-versioned release", () => {
    setUpValid(assets);
    const res = validate();
    expect(res.code).toBe(0);
    expect(res.stdout).toMatch(/safe to publish/i);
  });

  it("rejects an artifact whose filename does not carry the released version", () => {
    setUpValid(assets);
    writeFileSync(join(assets, "OneType_9.9.9_x64-setup.exe"), "stray");
    const res = validate();
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/does not contain the released version/i);
  });

  it("rejects a release with no checksums.txt", () => {
    setUpValid(assets);
    rmSync(join(assets, "checksums.txt"));
    const res = validate();
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/checksums\.txt/i);
  });

  it("rejects when latest.json disagrees with the released version", () => {
    setUpValid(assets);
    const manifest = JSON.parse(readFileSync(join(assets, "latest.json"), "utf8"));
    manifest.version = "1.2.4";
    writeFileSync(join(assets, "latest.json"), JSON.stringify(manifest));
    const res = validate();
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/does not match released version/i);
  });

  it("rejects when latest.json references a missing artifact", () => {
    setUpValid(assets);
    const manifest = JSON.parse(readFileSync(join(assets, "latest.json"), "utf8"));
    manifest.platforms["windows-x86_64"].url =
      `https://github.com/a/releases/download/v${VERSION}/nope.exe`;
    writeFileSync(join(assets, "latest.json"), JSON.stringify(manifest));
    const res = validate();
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/no such artifact was produced/i);
  });

  it("rejects stale artifacts from a different version", () => {
    setUpValid(assets);
    copyFileSync(join(assets, EXE), join(assets, "OneType_1.2.2_x64-setup.exe"));
    const res = validate();
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/does not contain the released version/i);
  });

  it("accepts the versionless macOS app-bundle updater payload", () => {
    setUpValid(assets);
    // Tauri names the macOS updater artifact <ProductName>.app.tar.gz — no
    // version in the filename. It must pass validation, unlike installers.
    writeFileSync(join(assets, "OneType.app.tar.gz"), "mac-app-bundle");
    writeFileSync(join(assets, "OneType.app.tar.gz.sig"), SIG);
    // Updating artifacts invalidates checksums.txt; regenerate to cover them.
    runSync(checksumsScript, "--dir", assets);
    const res = validate();
    expect(res.code).toBe(0);
  });
});

describe("release-notes.mjs", () => {
  beforeEach(() => {
    writeFileSync(join(assets, EXE), "windows-installer");
    writeFileSync(join(assets, "OneType_1.2.3_aarch64.dmg"), "mac-installer");
    writeFileSync(join(assets, DEB), "linux-package");
    runSync(checksumsScript, "--dir", assets);
  });

  it("renders a professional release body with downloads, instructions and checksums", () => {
    const out = join(dir, "notes.md");
    const res = runSync(
      notesScript,
      "--version", VERSION,
      "--tag", `v${VERSION}`,
      "--owner", "aungpwint",
      "--repo", "onetype",
      "--assets-dir", assets,
      "--checksums", join(assets, "checksums.txt"),
      "--out", out,
    );
    expect(res.code).toBe(0);
    const body = readFileSync(out, "utf8");
    expect(body).toContain(`# OneType v${VERSION}`);
    expect(body).toContain("## What's New");
    expect(body).toContain("## Downloads");
    expect(body).toContain(`releases/download/v${VERSION}/${EXE}`);
    expect(body).toContain("## Installation Instructions");
    expect(body).toContain("## SHA256 Checksums");
    expect(body).toContain(sha256("windows-installer"));
    expect(body).toContain("## Auto-update");
  });

  it("refuses to build notes for a mismatched tag/version pair", () => {
    const out = join(dir, "notes.md");
    const res = runSync(
      notesScript,
      "--version", "9.9.9",
      "--tag", `v${VERSION}`,
      "--owner", "a",
      "--repo", "b",
      "--assets-dir", assets,
      "--out", out,
    );
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/does not match version/i);
  });
});