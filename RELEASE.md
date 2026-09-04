# Releasing OneType & the Automatic Update System

This document explains how OneType is built, signed and published, and how its
automatic update (auto-updater) works, end to end.

It is written for OneType maintainers. **Never commit secrets, private signing
keys or certificate files to Git.**

---

## 1. Architecture overview

OneType is a **Tauri 2** app (Rust backend + React/TypeScript frontend). It uses
the official Tauri updater plugin — no custom protocol.

```
Developer
   │  bump version + tag vX.Y.Z + push
   ▼
GitHub Actions (release.yml)
   │  validate version → tests → typecheck/lint → build per platform
   │  → sign bundles (updater) → (optional) Authenticode sign Windows
   │  → upload artifacts
   ▼
publish job → merge latest.json → create GitHub Release → upload assets
   ▼
User installs from GitHub Release / Existing installs auto-update
```

The app's updater endpoint is
`https://github.com/<owner>/<repo>/releases/latest/download/latest.json`
(configured in `src-tauri/tauri.conf.json`). The `latest.json` manifest is what
lets installed apps learn about a new version; it is generated and uploaded by
the release workflow.

---

## 2. Versioning

Versioning is **Semantic Versioning** (`MAJOR.MINOR.PATCH`, e.g. `1.0.1`). The
same version must appear in three places:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

To keep them in sync, use the helper (never hand-edit all three):

```bash
node scripts/set-version.mjs 1.1.0
```

This rewrites all three files and then runs a consistency check.

CI runs `node scripts/check-versions.mjs` on every push/PR, and the release
workflow runs it with `--tag <tag>` so a tagged release whose tag does not match
the app version **fails**.

> Release channels: production defaults to **stable**. Pre-release tags
> (`vX.Y.Z-beta`) are treated as equal to the base version by the updater's
> numeric compare, which prevents a beta from accidentally "downgrading" a
> stable install.

---

## 3. Required CI secrets

Secrets are configured in GitHub → Settings → Secrets and variables → Actions.

| Secret | Purpose | Required |
| --- | --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | base64 minisign **private** key used to sign update bundles. Without it, updater artifacts (`.sig`) cannot be produced. | **Yes** |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | password for the above key. | **Yes** |
| `WINDOWS_CERTIFICATE` | base64 of a PFX containing the Authenticode certificate. | No (see §7) |
| `WINDOWS_CERTIFICATE_PASSWORD` | password for the PFX. | No (see §7) |

The workflow passes `TAURI_SIGNING_PRIVATE_KEY[_PASSWORD]` exactly as Tauri
expects. They are masked by GitHub and never printed in logs. Only the **public**
verification key lives in the repository (`plugins.updater.pubkey` in
`src-tauri/tauri.conf.json`); it is compiled into the app so clients can verify
signatures.

---

## 4. Setting up updater signing

The Tauri updater signs each bundle with a minisign key pair.

1. Generate a key pair (this is a Tauri CLI command):
   ```bash
   pnpm tauri signer generate -w ~/.tauri/onetype.key
   ```
   It writes `onetype.key` (private) and `onetype.key.pub` (public). Keep the
   private key **out of the repository** (the repo `.gitignore` already excludes
   `src-tauri/updater.key*`).
2. Set the public key into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
   (paste the full contents of `onetype.key.pub`).
3. In GitHub, add `TAURI_SIGNING_PRIVATE_KEY` = **base64 of the private key**
   and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = its password.

---

## 5. Creating a release (happy path)

```bash
# 1. Bump the version
node scripts/set-version.mjs 1.1.0

# 2. Commit the change
git add -A
git commit -m "release: v1.1.0"

# 3. Tag and push (the tag MUST match the app version)
git tag v1.1.0
git push origin main
git push origin v1.1.0
```

Pushing the `v*` tag triggers `.github/workflows/release.yml`, which:

1. Validates the version (tag vs app).
2. Installs dependencies, runs frontend tests, lint, typecheck, build.
3. Installs Rust, runs `cargo fmt --check`, `cargo clippy`, `cargo test`.
4. Builds the app + installers on Windows (x64), macOS (Apple Silicon) and
   Linux (x64). Updater `.sig` files are produced (requires the signing secrets).
5. (Optional) Authenticode-signs Windows bundles if the certificate secrets are
   set.
6. Uploads every platform's bundle as workflow artifacts.
7. The `publish` job downloads all artifacts, generates and merges
   `latest.json`, creates the GitHub Release with auto-generated notes, and
   uploads all assets — including `latest.json`.

A failed test, lint, typecheck, build or version check **fails the whole
workflow** and no release is published.

---

## 6. Building the Windows installer locally

```bash
# Prerequisites: Node + pnpm, Rust toolchain, Tauri v2 prerequisites for Windows
pnpm install
pnpm tauri build
```

Output (NSIS + MSI) lands in:

```
src-tauri/target/release/bundle/nsis/onetype_<version>_x64-setup.exe
src-tauri/target/release/bundle/nsis/onetype_<version>_x64-setup.exe.sig   (updater signature)
src-tauri/target/release/bundle/msi/onetype_<version>_x64_en-US.msi
```

If you need the updater artifacts locally, also set the signing env vars first:

```bash
TAURI_SIGNING_PRIVATE_KEY=<...> TAURI_SIGNING_PRIVATE_KEY_PASSWORD=<...> pnpm tauri build
```

### Offline installation

The NSIS installer is self-contained. Runtime components:

- **WebView2 Runtime**: ships with Windows 10/11 (the supported baselines). No
  download is required on a normal Windows 10/11 machine.
- No app code or data is downloaded during installation; every learner's data
  stays in the local SQLite database under the app's data directory.

To test offline installation:
```
1. Build the installer (above).
2. Put the .exe on a USB drive.
3. On a Windows machine with networking disabled, run the installer.
4. Launch OneType from the Start Menu / desktop shortcut and verify it works.
```

---

## 7. Windows code signing (Authenticode)

Code signing is **production-only and optional**: if you have an Authenticode
certificate, put the PFX (base64) and its password into the
`WINDOWS_CERTIFICATE` and `WINDOWS_CERTIFICATE_PASSWORD` secrets. When those two
secrets are both set, the Windows build signs the NSIS `.exe` and MSI with a
timestamp. When they are absent, the signing step is skipped; development and
staging builds remain clearly distinguishable from signed production builds.

A real certificate must be obtained from a CA (e.g. DigiCert, GlobalSign,
Sectigo). The pipeline is deliberately configured so the certificate can be
injected securely through CI secrets later without changing the workflow.

---

## 8. How the automatic update works

- The app checks for updates automatically at startup (throttled to once every
  6 hours, controlled by `app.autoUpdate` and `updater.lastChecked`).
- A manual "Check for updates" button is in **Settings → Updates**.
- A failed check never blocks startup; the app keeps working offline or when
  GitHub is unreachable.
- When a newer version is found (strictly greater semver; never downgrades),
  the user is offered **Update Now / Later** and shown the release notes.
- Downloading shows progress. After download the user chooses
  **Restart & Update**; the app relaunches and the installer completes.
- Signature verification is performed by the Tauri updater before any
  installation; a tampered or unverifiable update is rejected and the current
  installation is left untouched.
- Updates never touch user data: Tauri replaces the application binaries while
  the user database/settings live separately in the app's data directory.

### Testing an update end-to-end

1. Publish `v1.0.0` (baseline).
2. Install `v1.0.0` on a machine.
3. Publish `v1.0.1` from the same repo with `latest.json`.
4. On the installed machine, re-launch OneType (or hit "Check for updates").
   It should detect `v1.0.1`, download, verify, restart, and report `v1.0.1`.

### Offline → online

Install `v1.0.0` while offline, use it normally (no errors), then re-enable the
network. The next scheduled or manual check detects `v1.0.1` and updates as
above.

---

## 9. Release notes

Release notes are auto-generated by GitHub from merged PRs/conventional-commit
titles via `gh release create --generate-notes`. The same notes flow into the
update dialog through the `notes` field of `latest.json` (for reference, the
merge step points `notes` at the release page). The authoritative human-readable
history lives in `CHANGELOG.md`.

---

## 10. Recovering from a failed release

- **Build/test failed**: fix the issue, bump a patch, and push a new tag. No
  release was created, so nothing to clean up.
- **Partial release created but an asset upload failed**: re-run the `publish`
  job, or upload the missing asset manually:
  ```bash
  gh release upload v1.1.0 path/to/artifact --clobber
  ```
- **`latest.json` is missing from the release**: the updater falls back to the
  previous behavior (no update detected). Regenerate and upload it:
  ```bash
  gh release upload v1.1.0 latest.json --clobber
  ```

---

## 11. Rolling back a bad release

The updater refuses to move a user **backwards** in version. To recover from a
bad release, ship a fixed version **higher** than the bad one:

1. Fix the bug.
2. `node scripts/set-version.mjs <bad+1>` (e.g. bad was `1.1.0`, fix is `1.1.1`).
3. Commit, tag `v1.1.1`, push. Installed users who received `1.1.0` will now
   update to `1.1.1`.

> Do **not** attempt to replace a release with a lower tag in an effort to
> "downgrade" users — the updater (and NSIS) will not apply it and it erodes
> trust.

---

## 12. Developer commands

```bash
pnpm dev                  # browser-only preview (localStorage backend)
pnpm tauri dev            # desktop app (frontend + Rust) development
pnpm build                # production frontend build (tsc + vite)
pnpm tauri build          # desktop app + installers
pnpm typecheck            # TS strict type-check
pnpm lint                 # ESLint
pnpm test                 # Vitest
cargo test                # Rust unit tests (in src-tauri/)
cargo clippy              # Rust lints (in src-tauri/)
node scripts/check-versions.mjs          # validate version consistency
node scripts/set-version.mjs <version>   # bump version everywhere
```

---

## 13. Repository layout for releases

```
.github/workflows/ci.yml        # PR + push validation (incl. version check)
.github/workflows/release.yml   # tag-triggered build → sign → release → upload
scripts/                        # version + updater-manifest tooling
scripts/check-versions.mjs
scripts/set-version.mjs
scripts/generate-latest-json.mjs  # builds/merges latest.json
scripts/latest-json.test.ts       # tests for generate-latest-json
src-tauri/tauri.conf.json         # updater endpoint + pubkey + bundle config
CHANGELOG.md                      # human-readable release history
```
