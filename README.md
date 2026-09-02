# OneType

An on-device typing tutor for **English and Myanmar (မြန်မာ)**, built with Tauri 2, React 19, TypeScript, Tailwind v4 and Rust/SQLite.

Every learner's data lives in a local SQLite database — nothing leaves the machine.

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
