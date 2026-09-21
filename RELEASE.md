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

## 1b. Public vs private repository (update distribution is independent)

Repository **visibility is not the security mechanism**. An update is trusted
only because the artifact is cryptographically signed with the private release
key whose public half is compiled into the app (`plugins.updater.pubkey`). The
same installed application updates identically whether the source repository is
public or private — the app only needs public HTTPS read access to `latest.json`
and the signed artifacts, never GitHub authentication.

**Mode A — public repository (current).** GitHub Releases serves
`latest.json` and every bundle at unauthenticated HTTPS URLs
(`/releases/latest/download/<asset>`). Works with zero extra infrastructure.

**Mode B — private repository.** Private releases require authentication, so
point the app at your own public HTTPS distribution layer (Cloudflare R2,
S3/CloudFront, Azure Blob Storage, a CDN, or an app backend) and have the
release workflow publish artifacts + `latest.json` there. The **app-side config
does not change** — one centralized value changes:

1. Build the app with the distribution URL you control:
   `src-tauri/tauri.conf.json` → `plugins.updater.endpoints`, e.g.
   `https://updates.example.com/latest.json`.
2. In the workflow, keep building and signing exactly as today, then upload
   `dist/updates/*` (the bundles, their `.sig` files and the merged
   `latest.json`) to your object store/CDN as a CI-only write step. `latest.json`
   (short cache TTL) and immutable versioned bundles (long cache TTL) pair best
   with reads: `READ = public`, `WRITE = CI only`.
3. No GitHub token, storage secret or certificate key ever enters the app —
   the app performs **anonymous** signed-update checks. Credentials stay in
   GitHub Actions / server-side infrastructure only.

Never embed a GitHub token or storage credential in the application to "fix"
private-repository updates.

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

| Secret                               | Purpose                                                                                                                 | Required     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| `TAURI_SIGNING_PRIVATE_KEY`          | base64 minisign **private** key used to sign update bundles. Without it, updater artifacts (`.sig`) cannot be produced. | **Yes**      |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | password for the above key.                                                                                             | **Yes**      |
| `WINDOWS_CERTIFICATE`                | base64 of a PFX containing the Authenticode **code-signing** certificate. The Windows build is **best-effort** without it: the installer is produced **unsigned** with a clear warning (see §7). | No*      |
| `WINDOWS_CERTIFICATE_PASSWORD`       | password for the PFX.                                                                                                                                       | No*      |
| `APPLE_CERTIFICATE`                  | base64 `.p12` Apple **Developer ID Application** certificate used to sign the macOS app.                                | No (see §7b) |
| `APPLE_CERTIFICATE_PASSWORD`         | password for the `.p12`.                                                                                                | No (see §7b) |
| `APPLE_SIGNING_IDENTITY`             | signing identity as shown in Keychain, e.g. `Developer ID Application: Aung Pwint (TEAMID)`.                            | No (see §7b) |
| `APPLE_ID`                           | Apple ID used for notarization.                                                                                         | No (see §7b) |
| `APPLE_PASSWORD`                     | app-specific password for the Apple ID (create it at appleid.apple.com → App-Specific Passwords).                       | No (see §7b) |
| `APPLE_TEAM_ID`                      | Apple Developer Team ID.                                                                                                | No (see §7b) |

> The updater key (`TAURI_SIGNING_PRIVATE_KEY[_PASSWORD]`) is required for
> every release. `WINDOWS_CERTIFICATE[_PASSWORD]` (`*` above) are **strongly
> recommended but not required**: when present, Windows installers are
> Authenticode-signed (SHA-256 + RFC 3161 timestamp) and verified before upload;
> when absent, the Windows build is produced **unsigned** with a visible warning
> but the release still publishes. All other secrets are optional: when Apple
> secrets are absent, the macOS build is produced unsigned and clearly
> distinguishable from a signed production build.

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

    If the key already lives in the local environment as
    `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (the
    standard Tauri env names), `scripts/set-ci-secrets.ps1` copies that exact
    pair to the GitHub Actions secrets verbatim — no hand-typing, trimming or
    re-encoding:

    ```
    gh auth login
    pwsh scripts/set-ci-secrets.ps1
    ```

> The private key (GitHub secret / local env) and the public key in
> `tauri.conf.json` must be the **same key pair**. The release workflow's
> `verify-updater-pubkey.mjs` step fails the build if they drift apart.
> If you rotate the signing key, update BOTH the secret **and**
> `plugins.updater.pubkey` at the same time.

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
8. The Windows build runs `verify-updater-pubkey.mjs`, which fails the run if
   the signing key used to produce the `.sig` does **not** match
   `plugins.updater.pubkey` (a mismatch means installed apps would reject every
   update).

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
src-tauri/target/release/bundle/nsis/OneType_<version>_x64-setup.exe
src-tauri/target/release/bundle/nsis/OneType_<version>_x64-setup.exe.sig   (updater signature)
src-tauri/target/release/bundle/msi/OneType_<version>_x64_en-US.msi
```

> Note: the updater `.sig` filename is derived from the bundle name
> (`OneType_<version>_x64-setup.exe.sig`). That is expected — the release
> workflow matches `.sig` files independently (`*-setup.exe.sig`) and embeds
> the signature verbatim into `latest.json`, so the filename never matters at
> runtime.

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

Windows production builds **should** be Authenticode-signed with a real
CA-issued **code-signing** certificate (e.g. DigiCert, GlobalSign, Sectigo).
Signing is **best-effort**: when `WINDOWS_CERTIFICATE`/`WINDOWS_CERTIFICATE_PASSWORD`
are configured, every Windows artifact is signed, verified, and shipped signed;
when they are absent, CI and `pnpm tauri build` on Windows proceed **unsigned**
with a loud warning (see below) so a release is never blocked. The consequence
of not signing: Windows SmartScreen shows "Unknown publisher".

**How signing works (pipeline used must stay in-sync):**
- Signing is configured in `src-tauri/tauri.conf.json` →
  `bundle.windows.signCommand`, which points at
  `scripts/windows-signing.ps1 -Action Sign "%1"`.
- During `pnpm tauri build`, tauri-bundler invokes that script for the
  application `.exe`, the NSIS installer, the NSIS uninstaller and the MSI.
  The script decodes the base64 PFX from `WINDOWS_CERTIFICATE`, imports it into
  the `CurrentUser\My` certificate store, and signs with `signtool` using a
  **SHA-256** digest and an **RFC 3161 timestamp** (DigiCert by default,
  override with `WINDOWS_TIMESTAMP_URL`). It then re-verifies each file. If
  `WINDOWS_CERTIFICATE` is unset the script prints a warning and **skips**
  (exit 0), producing an unsigned build.
- The Tauri updater `.sig` files are produced **after** signing, over the final
  signed installers — do **not** sign Windows artifacts *after* `tauri build`
  (that would invalidate the `.sig` files).
- After the build, CI runs `scripts/windows-signing.ps1 -Action Verify` on the
  application `.exe` (extracted from the installer payload — tauri restores an
  unsigned copy at `release/onetype.exe`), on the NSIS installer and on the
  MSI, printing release diagnostics
  (publisher subject, issuer, expiry, thumbprint, signature status). This runs
  **only when signing was configured** and fails the run if any artifact is
  unsigned or invalid, so the exact bytes uploaded to the GitHub Release are
  the verified, signed ones.

**One-time setup (certificate → CI secrets):**

1. Obtain a code-signing certificate (Code Signing EKU 1.3.6.1.5.5.7.3.3) and
   export it together with its private key as a `.pfx` (DigiCert: "Export with
   private key" → PKCS #12). Keep the file private.
2. Set the GitHub Actions secrets (values are masked, never logged):

    ```bash
    cert_b64=$(base64 -w0 /path/to/code-signing.pfx)
    gh secret set WINDOWS_CERTIFICATE       --repo aungpwint/onetype --body "$cert_b64"
    gh secret set WINDOWS_CERTIFICATE_PASSWORD --repo aungpwint/onetype   # prompts, hidden input
    ```

3. Confirm the secrets are set (values cannot be read back — GitHub only
    reveals names):

    ```bash
    gh secret list --repo aungpwint/onetype
    ```

    The full validation (PFX decodes, imports, signs every artifact with a
    timestamp, chains to a trusted root) runs automatically on the next
    release; any problem fails the Windows leg with a clear message.

**Local production Windows build (developer machine):**

```powershell
$env:WINDOWS_CERTIFICATE            = "<base64 PFX of your code-signing certificate>"
$env:WINDOWS_CERTIFICATE_PASSWORD   = "<PFX password>"
$env:TAURI_SIGNING_PRIVATE_KEY      = "<base64 minisign key from set-ci-secrets>"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<minisign key password>"
pnpm tauri build
# verify every artifact that should be signed (the signed app exe lives inside
# the installer payload; tauri restores an unsigned copy at release/onetype.exe):
pwsh scripts/windows-signing.ps1 -Action Verify -File src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\<...>_x64-setup.exe
pwsh scripts/windows-signing.ps1 -Action Verify -File src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\<...>.msi
```

`pnpm tauri dev` needs none of these variables (no bundling happens in dev), so
day-to-day development is unaffected.

**Microsoft Artifact Signing alternative:** this project ships only from GitHub
Actions and has no Azure account/trust setup, so standard OV code-signing is
used. Because signing goes through the single `bundle.windows.signCommand`
hook, adopting Microsoft Artifact Signing later only requires pointing that
command at the Artifact Signing CLI (and adding the `AZURE_*` secrets); the
signing-configuration gate and the verification step above stay unchanged.

> **SmartScreen note:** a correctly signed installer removes the "Unknown
> publisher" warning, because Windows then identifies the publisher from the
> embedded certificate. It does **not** give an immediate untracked reputation
> score; until an app's reputation is established, SmartScreen may still show
> "Unrecognized app" on brand-new, low-volume signatures. That warning is
> expected and resolves as reputation builds; it is a reputation question, not
> a signing defect.

---

## 7b. macOS code signing & notarization

macOS signing is **production-only and optional**: when the `APPLE_*` secrets are
all set, the macOS build signs the `.app` with your **Developer ID Application**
certificate and notarizes it with Apple (both are done by tauri-bundler during
`pnpm tauri build` through the environment variables the workflow passes). When
they are absent, the macOS build is produced unsigned and Gatekeeper will warn
on first launch — clearly distinct from signed production builds.

Setup (one-time):

1. In Keychain Access → My Certificates, export your **Developer ID
   Application** certificate as a `.p12` with a password of your choice.
2. Set the CI secrets (values are masked by GitHub, never logged):

    ```bash
    # base64-encode the .p12 so it can live in a single secret:
    cert_b64=$(base64 -w0 /path/to/cert.p12)
    gh secret set APPLE_CERTIFICATE     --repo aungpwint/onetype --body "$cert_b64"
    gh secret set APPLE_CERTIFICATE_PASSWORD --repo aungpwint/onetype

    # identity exactly as shown in Keychain, e.g.
    gh secret set APPLE_SIGNING_IDENTITY --repo aungpwint/onetype  # "Developer ID Application: Aung Pwint (TEAMID)"

    # notarization account
    gh secret set APPLE_ID    --repo aungpwint/onetype  # your Apple ID email
    gh secret set APPLE_PASSWORD --repo aungpwint/onetype  # app-specific password
    gh secret set APPLE_TEAM_ID --repo aungpwint/onetype   # Team ID
    ```

    > Never commit the `.p12` or any of these secret values to the repository.
    > The failure mode of a hardcoded Apple credential is account compromise and
    > automatic revocation of your signing identity.

3. Re-run the release. The `Import Apple certificate` step imports the `.p12`
   into the ephemeral runner keychain, and the `Build & sign release bundles`
   step passes `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` and
   `APPLE_TEAM_ID` to tauri-bundler, which signs and notarizes the app.

4. If only a subset of the `APPLE_*` secrets is set, the workflow still succeeds
   but produces an **unsigned** macOS build. Set all of them together for a
   fully signed, notarized build.

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

Release notes are generated by `scripts/release-notes.mjs` from commit history
since the previous tag (categorised into What's New / Fixed with a curated
override), enriched with per-platform Downloads, Installation Instructions and
the actual SHA256 Checksums block read from `checksums.txt`. The `publish` job
builds them into `dist/release-notes.md` and passes that file to
`gh release create --notes-file`. The same notes flow into the update dialog
through the `notes` field of `latest.json` (which points at the release page).
The authoritative human-readable history lives in `CHANGELOG.md`.

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
.github/scripts/verify-updater-pubkey.mjs  # fails CI if signing key ≠ configured pubkey
scripts/                        # version + updater-manifest tooling
scripts/check-versions.mjs
scripts/set-version.mjs
scripts/generate-latest-json.mjs  # builds/merges latest.json
scripts/latest-json.test.ts       # tests for generate-latest-json
src-tauri/tauri.conf.json         # updater endpoint + pubkey + bundle config
CHANGELOG.md                      # human-readable release history
```
