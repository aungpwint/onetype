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
 * Both the `.sig` and the configured pubkey are base64-encoded minisign
 * "boxes" whose decoded text has two lines:
 *
 *   line 1: `untrusted comment: …`
 *   line 2: a base64 token
 *
 * Signature token decodes to a 74-byte binary blob: [0x45 0x44]("ED") + keyid(8) + signature(64).
 * Public key token decodes to a 42-byte binary blob:  [0x45 0x64]("Ed") + keyid(8) + publickey(32).
 * The keyid bytes embedded in a signature equal the keyid bytes embedded in the
 * public key token, so comparing them proves the signing key matches the config.
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

function decodeBox(filePath, kind) {
  const blob = readFileSync(filePath, "utf8").trim();
  const text = Buffer.from(blob, "base64").toString("utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) fail(`Unexpected ${kind} structure in ${filePath}.`);
  const token = lines[1].trim();
  const bytes = Buffer.from(token, "base64");
  return { bytes, text };
}

function bytesToHex(b) {
  return b.toString("hex").toUpperCase().replace(/(..)(?=.)/g, "$1 ");
}

function sigKeyId(sigPath) {
  const { bytes } = decodeBox(sigPath, ".sig");
  if (bytes.length !== 74) {
    fail(`Signature token decodes to ${bytes.length} bytes; expected 74.`);
  }
  if (!bytes.subarray(0, 2).equals(Buffer.from([0x45, 0x44]))) {
    fail(`Signature token does not start with the ED magic (${bytesToHex(bytes.subarray(0, 2))}).`);
  }
  return bytes.subarray(2, 10);
}

function configPubkeyInfo() {
  const confPath = join(root, "src-tauri", "tauri.conf.json");
  const conf = JSON.parse(readFileSync(confPath, "utf8"));
  const b64 = conf?.plugins?.updater?.pubkey;
  if (!b64) fail("plugins.updater.pubkey is missing from src-tauri/tauri.conf.json.");
  const text = Buffer.from(b64, "base64").toString("utf8");
  const tokenLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("RW"));
  if (!tokenLine) fail("Configured pubkey has no key token line (RW…).");
  const bytes = Buffer.from(tokenLine, "base64");
  if (bytes.length !== 42) {
    fail(`Configured pubkey token decodes to ${bytes.length} bytes; expected 42.`);
  }
  if (!bytes.subarray(0, 2).equals(Buffer.from([0x45, 0x64]))) {
    fail(`Configured pubkey token does not start with the Ed magic (${bytesToHex(bytes.subarray(0, 2))}).`);
  }
  const keyId = bytes.subarray(2, 10);
  const comment = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("untrusted comment"));
  return { keyId, comment };
}

const sigId = sigKeyId(sigPath);
const { keyId: configId, comment } = configPubkeyInfo();

if (sigId.equals(configId)) {
  console.log(
    `[verify-updater-pubkey] OK — signing key matches plugins.updater.pubkey (${comment ?? keyId.toString("hex").toUpperCase()}).`,
  );
  process.exit(0);
}

fail(
  `Signing key mismatch. The .sig carries key id ${bytesToHex(
    sigId,
  )}, but plugins.updater.pubkey embeds ${bytesToHex(
    configId,
  )}. Update src-tauri/tauri.conf.json (or the CI signing secrets) so they agree, ` +
    "otherwise installed apps will reject every update.",
);