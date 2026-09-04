import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts/generate-latest-json.mjs");

// A valid 3-line minisign-style blob (base64). Content is not cryptographically
// meaningful here; we only verify the script persists it verbatim.
const SIG = [
  "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkK",
  "UlVRYkZuWGdka1N4OUpLemkwVDhyL0U5b2lpbUF4NVV2V2RxRHdITzVLRC9PbmkzcWY4OG90dzkxUzRPSzRjZFRqazNUL0p6WE43UXZ4SjJpYm5QUHVDZWd2dERHYXhaNFFZPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxCg==",
  "ZmlsZTpkb21teQo=",
].join("");

let dir: string;
let sigFile: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "onetype-updater-"));
  sigFile = join(dir, "dummy-setup.exe.sig");
  writeFileSync(sigFile, SIG);
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(...args: string[]) {
  return execFileSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

describe("generate-latest-json.mjs (partial)", () => {
  it("writes a partial manifest with the platform key and verbatim signature", () => {
    const out = join(dir, "partial.json");
    run(
      "--partial",
      "--target", "windows-x86_64",
      "--url", "https://example.com/dummy-setup.exe",
      "--sig-file", sigFile,
      "--out", out,
    );
    const parsed = JSON.parse(readFileSync(out, "utf8"));
    expect(parsed.platforms["windows-x86_64"].url).toBe("https://example.com/dummy-setup.exe");
    expect(parsed.platforms["windows-x86_64"].signature).toBe(SIG);
  });

  it("rejects unknown platform keys", () => {
    const out = join(dir, "bad.json");
    expect(() =>
      run("--partial", "--target", "windows-commodore64", "--url", "u", "--sig-file", sigFile, "--out", out),
    ).toThrow();
  });

  it("fails when the signature file is missing", () => {
    const out = join(dir, "missing.json");
    expect(() =>
      run("--partial", "--target", "windows-x86_64", "--url", "u", "--sig-file", join(dir, "nope.sig"), "--out", out),
    ).toThrow(/not found/i);
  });
});

describe("generate-latest-json.mjs (merge)", () => {
  it("merges multiple partials into one manifest", () => {
    const p1 = join(dir, "p1.json");
    const p2 = join(dir, "p2.json");
    run("--partial", "--target", "windows-x86_64", "--url", "https://example.com/a.exe", "--sig-file", sigFile, "--out", p1);
    run("--partial", "--target", "darwin-aarch64", "--url", "https://example.com/a.dmg", "--sig-file", sigFile, "--out", p2);

    const out = join(dir, "merged.json");
    run(
      "--merge",
      "--version", "1.1.0",
      "--pub-date", "2026-01-01T00:00:00Z",
      "--notes", "Notes",
      "--partials", `${p1} ${p2}`,
      "--out", out,
    );
    const m = JSON.parse(readFileSync(out, "utf8"));
    expect(m.version).toBe("1.1.0");
    expect(m.notes).toBe("Notes");
    expect(Object.keys(m.platforms)).toEqual(
      expect.arrayContaining(["windows-x86_64", "darwin-aarch64"]),
    );
  });

  it("rejects duplicate platforms", () => {
    const p = join(dir, "dup.json");
    run("--partial", "--target", "windows-x86_64", "--url", "u", "--sig-file", sigFile, "--out", p);
    const out = join(dir, "dup-out.json");
    expect(() =>
      run("--merge", "--version", "1.1.0", "--pub-date", "x", "--partials", `${p} ${p}`, "--out", out),
    ).toThrow(/duplicate platform/i);
  });

  it("rejects an empty merge", () => {
    const out = join(dir, "empty.json");
    expect(() =>
      run("--merge", "--version", "1.1.0", "--pub-date", "x", "--partials", "", "--out", out),
    ).toThrow();
  });
});
