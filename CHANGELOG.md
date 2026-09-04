# Changelog

All notable changes to OneType are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is the authoritative record for human-readable release notes; the
`release` GitHub Actions workflow attaches it (via auto-generated notes) to
every GitHub Release.

## [Unreleased]
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

## [1.0.0] - 2026
### Added
- English & Myanmar keyboard layouts with per-key statistics.
- Progressive curriculum (beginner → intermediate → advanced) and timed tests.
- Live WPM/CPM/accuracy scoring with resizable exercises.
- Multiple learners, streaks, achievements, full stats and charts.
- Backup & restore (export/import database or a single learner).
- Teacher view for aggregated classroom progress.
- Automatic updates via the Tauri updater plugin (signed; 6-hour throttle).
