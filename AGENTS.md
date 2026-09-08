# AGENTS.md

Guidance for working in this repository.

## Project

OneType is a Tauri 2 desktop app (Rust backend + React/TypeScript frontend) with
a GitHub Actions-driven release pipeline and automatic updates.

Key commands (run from repo root):

```bash
pnpm dev                  # browser-only preview
pnpm tauri dev            # desktop app (frontend + Rust)
pnpm build                # production frontend build (tsc + vite)
pnpm typecheck            # TS strict type-check
pnpm lint                 # ESLint
pnpm test                 # Vitest frontend tests
cargo test                # Rust tests (in src-tauri/)
pnpm release              # scripts/release.mjs: clean tree → quality gates → tag → push
node scripts/check-versions.mjs  # validate version consistency
node scripts/set-version.mjs <v> # bump version in package.json, Cargo.toml, tauri.conf.json
```

## Releasing a new version

The full process is documented in `RELEASE.md`. Rules that must never be skipped:

- **Version must match in three places** (`package.json`, `src-tauri/Cargo.toml`,
  `src-tauri/tauri.conf.json`). Use `node scripts/set-version.mjs <version>`,
  never hand-edit them.
- **NEVER push a release tag unless the GitHub Actions workflows
  (`.github/workflows/ci.yml` and `.github/workflows/release.yml`) pass** —
  including the `Frontend tests` and `Rust tests` steps. Before and after pushing
  a tag, check the Actions runs at `https://github.com/aungpwint/onetype/actions`
  for test/check errors. The workflow is the real gatekeeper: a failed test,
  lint, typecheck, build or version check fails the whole run and no release is
  published.
- Never commit secrets or signing keys (`TAURI_SIGNING_PRIVATE_KEY[_PASSWORD]`,
  `WINDOWS_CERTIFICATE[_PASSWORD]`) to the repository; they live only in GitHub
  Actions secrets, configured via `scripts/set-ci-secrets.ps1`.
