# Changelog

All notable changes to OneType are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is the authoritative record for human-readable release notes; the
`release` GitHub Actions workflow attaches it (via auto-generated notes) to
every GitHub Release.

## [Unreleased]

## [1.0.1] - 2026
### Changed
- Product name now displays as **OneType** (installer, shortcuts, window title);
  bundles are named `OneType_<version>_x64-setup.exe` / `…_x64_en-US.msi`.
- App and installer icons regenerated at high resolution from the original
  `OneTypeLogo.png` — the Windows `icon.ico` now embeds 16/24/32/48/64/256px
  frames so the taskbar, Alt-Tab, shortcuts and large-icon views render sharply.
- Corrected the updater public key in `tauri.conf.json` to match the production
  signing key (previously mismatched → all updates would have been rejected).
- Windows updater signature files are now matched independently in the release
  workflow (`*_setup.exe.sig`), fixing the pairing that broke when bundle names
  changed from `onetype_*` to `OneType_*`.
- Updater manifests (`latest.json`) now cover every platform the release matrix
  builds — Windows NSIS, macOS ARM64 (`.app.tar.gz`) and Linux AppImage —
  instead of Windows only, so in-app updates work on all platforms. Partial
  manifests are also no longer uploaded as release assets.

### Added
- Production release pipeline: `latest.json` updater manifest is now generated
  and uploaded to every GitHub Release so the in-app auto-updater can detect
  new versions.
- Version consistency guard: `scripts/check-versions.mjs` validates that
  `package.json`, `Cargo.toml` and `tauri.conf.json` agree on the same semver
  and (for tags) that the Git tag matches. Runs in CI and on every release.
- `scripts/set-version.mjs`: bump the application version across all three
  config files with a single command.
- Windows Authenticode code-signing readiness in the release workflow
  (optional `WINDOWS_CERTIFICATE` / `WINDOWS_CERTIFICATE_PASSWORD` secrets).
- Additional updater failure-path tests (disk space, malformed metadata) and
  release-pipeline tests for `latest.json` generation/merging.

### Fixed
- Release workflow build command: removed the stale `--release` flag (Tauri v2
  `tauri build` is release-only and rejects it) — the first tag build had failed
  on every platform before producing bundles.
- Release workflow toolchain bumped to Node 24 (Node 20 is deprecated on GitHub
  Actions runners).
- Replaced the malformed `plugins.updater.pubkey` in `tauri.conf.json` (corrupt
  base64 after a copy/paste mangling — `tauri build` failed with
  `failed to decode pubkey`) with the public key derived from the production
  signing machine's secret key; a signed local build now produces valid
  installers and `.sig` files.
- Rewrote `verify-updater-pubkey.mjs` for the real minisign format: a signature
  token embeds magic + 8-byte key id + 64-byte signature (the public key is not
  inside a signature), so the guard now compares the key id embedded in the
  produced `.sig` with the configured pubkey instead of the previous
  byte-halving that could never match.

### Security
- `.github/scripts/verify-updater-pubkey.mjs` checks in CI that the updater
  signing key matches `plugins.updater.pubkey` and fails the release otherwise.
- Release workflow now validates the `TAURI_SIGNING_PRIVATE_KEY` /
  `_PASSWORD` secrets *before* compiling, failing fast with an actionable
  message instead of the cryptic `Missing comment in secret key` from the
  bundler.
- Documented public vs. private repository update distribution — the app treats
  repository visibility and update authenticity as independent concerns
  (updates are trusted by cryptographic signature, never by GitHub presence),
  with no GitHub credentials ever embedded in the application.

## [1.0.0] - 2026
### Added
- English & Myanmar keyboard layouts with per-key statistics.
- Progressive curriculum (beginner → intermediate → advanced) and timed tests.
- Live WPM/CPM/accuracy scoring with resizable exercises.
- Multiple learners, streaks, achievements, full stats and charts.
- Backup & restore (export/import database or a single learner).
- Teacher view for aggregated classroom progress.
- Automatic updates via the Tauri updater plugin (signed; 6-hour throttle).

[1.0.1]: https://github.com/aungpwint/onetype/releases/tag/v1.0.1
