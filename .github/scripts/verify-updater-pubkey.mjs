#!/usr/bin/env node
/**
 * verify-updater-pubkey.mjs
 *
 * CI guard (spec §12): asserts that the updater signing private key used to
 * produce a given `.sig` matches the public key embedded in
 * `src-tauri/tauri.conf.json` (plugins.updater.pubkey). If they disagree the
 * app would reject every update at runtime, so we fail the build instead.
 *
 * Usage:
 *   node .github/scripts/verify-updater-pubkey.mjs --sig <path-to.sig>
 *
 * A Tauri `.sig` is the base64 encoding of a minisign detached signature whose
 * binary blob is: 32-byte public key || 64-byte signature. The configured
 * pubkey is the base64 of `untrusted comment: minisign public key: <hex>\nRWT<key>\n`.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sigArg = process.argv.indexOf("--sig");
if (sigArg === -1 || !process.argv[sigArg + 1]) {
  console.error("Usage: node verify-updater-pubkey.mjs --sig <path-to.sig>");
  process.exit(2);
}

const sigPath = resolve(root, process.argv[sigArg + 1]);

function fail(message) {
  console.error(`[verify-updater-pubkey] FAIL: ${message}`);
  process.exit(1);
}

function decodeSigPubkey(filePath) {
  const blob = readFileSync(filePath, "utf8").trim();
  const text = Buffer.from(blob, "base64").toString("utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) fail(`Unexpected .sig structure in ${filePath}.`);
  const sig = Buffer.from(lines[1].trim(), "base64");
  if (sig.length < 32) fail(`Signature blob too short in ${filePath}.`);
  return sig.subarray(0, 32);
}

function decodeConfiguredPubkey() {
  const confPath = join(root, "src-tauri", "tauri.conf.json");
  const conf = JSON.parse(readFileSync(confPath, "utf8"));
  const b64 = conf?.plugins?.updater?.pubkey;
  if (!b64) fail("plugins.updater.pubkey is missing from src-tauri/tauri.conf.json.");
  const text = Buffer.from(b64, "base64").toString("utf8");
  const keyLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("RWT") || l.startsWith("RWS"));
  if (!keyLine) fail("Configured pubkey has no key line (RWT…).");
  const key = Buffer.from(keyLine.slice(3), "base64");
  if (key.length !== 32) fail(`Configured pubkey decodes to ${key.length} bytes; expected 32.`);
  return key;
}

const fromSig = decodeSigPubkey(sigPath);
const fromConfig = decodeConfiguredPubkey();

if (fromSig.equals(fromConfig)) {
  console.log("[verify-updater-pubkey] OK — signing key matches plugins.updater.pubkey.");
  process.exit(0);
}

fail(
  `Signing key mismatch. The .sig was produced with public key ${
    fromSig.toString("hex").toUpperCase()
  }, but plugins.updater.pubkey embeds ${
    fromConfig.toString("hex").toUpperCase()
  }. Update src-tauri/tauri.conf.json (or the CI signing secrets) so they agree, " +
    "otherwise installed apps will reject every update.`,
);