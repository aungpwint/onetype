# OneType

An on-device typing tutor for **English and Myanmar (မြန်မာ)**, built with Tauri 2, React 19, TypeScript, Tailwind v4 and Rust/SQLite.

Every learner's data lives in a local SQLite database — nothing leaves the machine.

## Installation

Get the latest installer for your platform from the **[Latest Release](https://github.com/aungpwint/onetype/releases/latest)**. Installers are signed, every release ships a `checksums.txt` for verification, and installed apps auto-update in the background when a new version is published.

| Platform | File (from the latest release) | Install |
| --- | --- | --- |
| **Windows** | `OneType_<version>_x64-setup.exe` | Run the installer and follow the wizard. |
| **macOS (Apple Silicon)** | `OneType_<version>_aarch64.dmg` | Open the DMG, drag **OneType.app** into Applications, then right-click → *Open* the first time (Gatekeeper). |
| **Linux (Debian/Ubuntu)** | `onetype_<version>_amd64.deb` | `sudo apt install -y ./onetype_<version>_amd64.deb` |
| **Linux (Fedora/RHEL)** | `onetype-<version>-1.x86_64.rpm` | `sudo dnf install -y ./onetype-<version>-1.x86_64.rpm` |

### Linux — one-line installer

```bash
curl -fsSL -o install.sh https://raw.githubusercontent.com/aungpwint/onetype/main/install.sh
bash install.sh
```

`install.sh` detects your distribution and architecture, downloads the correct package from the latest GitHub Release, **verifies its SHA256 checksum** against the release's `checksums.txt`, and only then installs it. Nothing is executed until the download passes verification. Pin a version or override the repository:

```bash
bash install.sh --version v1.2.3 --repo aungpwint/onetype
```

### Verify downloads manually

```bash
# Windows (PowerShell)
Get-FileHash .\OneType_1.0.1_x64-setup.exe -Algorithm SHA256

# macOS / Linux
shasum -a 256 OneType_1.0.1_aarch64.dmg
sha256sum onetype_1.0.1_amd64.deb
```

Compare the output with `checksums.txt` from the release.

## Features

- **English & Myanmar keyboard layouts** with per-key statistics (accuracy, weak keys, weak fingers).
- **Progressive curriculum** (beginner → intermediate → advanced) and timed tests with pass targets.
- **Live scoring** — WPM, CPM, accuracy, resizable exercises, virtual keyboard and hand guide.
- **Learners** — create multiple learners, track each one's progress separately.
- **Streaks & achievements** — daily streak tracking plus 14 unlockable achievements.
- **Full stats & charts** — speed, accuracy, weak keys/fingers, curriculum levels, timed-test bests, time-range filter.
- **Keyboard shortcuts** — navigate and control practice from the keyboard.
- **Backup & restore** — export/import the whole database or a single learner.
- **Teacher view** — aggregated classroom progress across learners.

## Tech stack

| Layer | Choice |
| --- | --- |
| Shell | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript (strict) |
| Styling | Tailwind v4 + custom theme (light/dark) |
| State | Zustand |
| Storage | SQLite via `rusqlite` (Tauri) / localStorage (browser preview) |
| Tests | Vitest (frontend), cargo test (Rust) |

The `src/services/backend.ts` facade switches between Tauri IPC and a localStorage-backed `localBackend` so the app also runs as a plain Vite+React app in the browser during development.

## Development

Prerequisites: Node + pnpm, Rust toolchain, and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
pnpm install
pnpm tauri dev      # desktop app (frontend + Rust)
pnpm dev            # browser-only preview (localStorage backend)
```

## Checks & tests

```bash
pnpm typecheck      # TypeScript strict
pnpm lint           # ESLint
pnpm test           # Vitest
cargo check         # in src-tauri/
cargo clippy        # lints
cargo test          # Rust unit tests
```

## Production build

```bash
pnpm tauri build
```

This bundles the React app, embeds the Rust backend with a content security policy, and produces the platform installer under `src-tauri/target/release/bundle/`.

## Releases & auto-updates

OneType ships signed installers and auto-updates through GitHub Releases. See **[RELEASE.md](./RELEASE.md)** for:

- How to build the Windows installer (and test offline installation).
- Versioning and the `scripts/set-version.mjs` helper.
- Required CI secrets (`TAURI_SIGNING_PRIVATE_KEY[_PASSWORD]`, `WINDOWS_CERTIFICATE[_PASSWORD]`).
- Creating a release and how the auto-updater works end to end.
- Recovering from a failed release and rolling back a bad one.

The application version must be kept identical across `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`; CI enforces this with `scripts/check-versions.mjs`.

To cut a release, run `npm run release -- --next <version> --push` from a clean tree — it bumps the version, runs the quality gates, creates the `v<version>` tag, and the GitHub Actions workflow builds, signs, validates checksums, and publishes the release.
