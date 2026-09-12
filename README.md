# OneType

**A friendly typing tutor for English and Myanmar (မြန်မာ) that never leaves your computer.**

OneType helps you learn to touch-type — typing without looking at your hands — one key at a time. It works completely offline, keeps every lesson, score and statistic on your own machine, and needs **no account, no internet and no cloud**.

> Every key you press stays on this device.

---

## What OneType offers

| | |
| --- | --- |
| **Two layouts, one app** | Full on-screen keyboards for English (QWERTY) and Myanmar (Pyidaungsu), with a hand guide that shows which finger reaches each key. |
| **Step-by-step lessons** | A progressive curriculum — beginner → intermediate → advanced — that builds up words, phrases and full sentences. Characters light up as you go, and mistakes are caught instantly. |
| **Adaptive drill** | OneType watches which keys trip you up and builds a short drill around exactly those keys. |
| **Timed tests** | Sit real 1, 3, 5 and 10-minute papers with passing targets (accuracy + speed), the way a classroom exam would score them. |
| **Quick practice** | No setup, no student profile needed — just pick a duration, a word count, a quotation, or paste your own text and start. |
| **Live feedback** | Speed (WPM/CPM), accuracy, elapsed time and a virtual keyboard that stays in sync with your hands while you type. |
| **Progress you can see** | Charts for speed and accuracy over time, weak keys and fingers, curriculum levels, test results, daily streaks and 14 unlockable achievements. |
| **Multiple learners** | Create profiles for each learner; every one gets its own progress, stats and settings. |
| **Teacher view** | A combined overview of the whole class — who's practicing, how often, and how everyone is improving. |
| **Backup & restore** | Export your entire database (or a single learner) to a file, and import it again on any machine. |

---

## Getting started

1. **Install OneType** (see [Downloading & installing](#downloading--installing) below).
2. On the welcome screen, **give the learner a name** and choose a **start language** — English, Myanmar, or both over time. That's it; the desk opens.
3. From the sidebar you can:

   - **Learn** — work through the lessons in order.
   - **Practice** — a free warm-up any time you want a quick session.
   - **Adaptive drill** — generated automatically from the keys you keep missing.
   - **Timed tests** — the formal papers with passing targets.
   - **Progress** — your streaks, achievements and charts.
   - **Teacher** — the classroom-wide view (great for teachers and parents).

### Inside a session

- An **on-screen keyboard** and **hand guide** follow you as you type, so you can learn where every key lives without peeking at your fingers.
- **Lessons** pause on the start line: press **Tab** to begin. **Tests and drills** start on your first keystroke.
- Press **Esc** to pause, and **Tab** (or **Enter**, if you change it in Settings) twice quickly to restart the run from the top.
- Finish a run and OneType shows your score, accuracy, speed, and whether you passed — then saves it to the learner's history.

---

## Keyboard shortcuts

| Shortcut | What it does |
| --- | --- |
| `Ctrl`/`Cmd` + `K` | Open the command palette (search anything) |
| `Ctrl`/`Cmd` + `1` | Dashboard |
| `Ctrl`/`Cmd` + `2` | Learn |
| `Ctrl`/`Cmd` + `3` | Timed tests |
| `Ctrl`/`Cmd` + `4` | Progress |
| `Ctrl`/`Cmd` + `5` | Settings |
| `Esc` | Pause a running session |
| `R` | Restart a paused/ready session, retry after finishing |
| `Tab` | Start a lesson · double-press to restart |

---

## Privacy

- All data — learners, lessons, scores, statistics — is stored in a **local database on your machine**.
- Nothing is uploaded anywhere, and OneType does **not** phone home.
- Want to move machines or keep a copy? Use **Backup & restore** in Settings to export to a file.

---

## Downloading & installing

Grab the latest installer for your platform from the **[Latest Release](https://github.com/aungpwint/onetype/releases/latest)** page. Every release ships checksums for verifying the download, and installed apps **update themselves automatically** in the background when a new version is published.

| Platform | File | How to install |
| --- | --- | --- |
| **Windows** | `OneType_<version>_x64-setup.exe` | Run the installer and follow the wizard. |
| **macOS (Apple Silicon)** | `OneType_<version>_aarch64.dmg` | Open the DMG and drag **OneType.app** into Applications. The first launch, right-click → **Open** (macOS may warn about apps downloaded from the internet). |
| **Linux (Debian/Ubuntu)** | `OneType_<version>_amd64.deb` | `sudo apt install -y ./OneType_<version>_amd64.deb` |
| **Linux (Fedora/RHEL)** | `OneType-<version>-1.x86_64.rpm` | `sudo dnf install -y ./OneType-<version>-1.x86_64.rpm` |

### Linux — one-line installer

```bash
curl -fsSL -o install.sh https://raw.githubusercontent.com/aungpwint/onetype/main/install.sh
bash install.sh
```

The script detects your distribution and architecture, downloads the correct package, **verifies its checksum** against the release's official `checksums.txt`, and only then installs it. You can also pin a version:

```bash
bash install.sh --version v1.2.3
```

### Verify a download yourself (optional)

```bash
# Windows (PowerShell)
Get-FileHash .\OneType_1.0.1_x64-setup.exe -Algorithm SHA256

# macOS / Linux
shasum -a 256 OneType_1.1.0_aarch64.dmg
sha256sum OneType_1.1.0_amd64.deb
```

Compare the output against `checksums.txt` from the release page.

---

## Troubleshooting

- **App is stuck on "preparing" or won't open a lesson/test/drill?** OneType retries automatically a few times, then shows a *Try again* button — if the message keeps coming back, close and reopen the app, then check the release notes in case the issue was already fixed.
- **macOS says the app "can't be opened"?** Right-click the app and choose **Open**.

For anything else, open an issue at [github.com/aungpwint/onetype/issues](https://github.com/aungpwint/onetype/issues).

---

## For developers

OneType is a Tauri 2 app with a React + TypeScript frontend and a Rust/SQLite backend. Technical guides live in **`AGENTS.md`** (daily commands), **`RELEASE.md`** (cutting a release, signing, auto-updates), and `RELEASE.md` §3 lists the CI secrets.

```bash
pnpm install
pnpm tauri dev      # desktop app (frontend + Rust)
pnpm dev            # browser-only preview
```

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, plus `cargo check && cargo clippy && cargo test` in `src-tauri/`. Installers are produced with `pnpm tauri build`.