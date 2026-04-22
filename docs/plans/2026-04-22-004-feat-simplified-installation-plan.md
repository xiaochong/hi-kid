---
title: Simplified Installation
type: feat
status: active
date: 2026-04-22
origin: docs/brainstorms/2026-04-22-simplified-installation-requirements.md
---

# Simplified Installation

## Overview

Replace the multi-step manual installation with an automated first-launch experience. The app will detect missing dependencies, guide the user to install system packages, and automatically download binaries and models. A standalone shell script is also provided for power users who want to pre-install everything.

## Problem Frame

Today a parent must follow 4+ manual steps (brew install, curl binaries, curl models, install Ollama) before a child can use HiKid. This is a high barrier for non-technical users. Model files total ~2GB and cannot be bundled in the installer. (see origin: docs/brainstorms/simplified-installation-requirements.md)

## Requirements Trace

- R1. Installer does not bundle ASR/TTS models or server binaries
- R3. Startup detects SoX, espeak-ng, binaries, models, and Ollama state in sequence
- R4. SoX/espeak-ng missing → modal with `brew install` command and copy-to-clipboard button
- R5. Binaries missing → auto-download from GitHub Releases
- R6. Models missing → auto-download from GitHub Releases with resume support
- R7. Ollama missing → informational prompt only, no auto-install
- R8. Download progress shown per-file and overall; cancellation supported
- R9. All checks pass → main UI without restart
- R10. Provide `scripts/install-dependencies.sh`
- R11. Script installs SoX, espeak-ng, binaries, and models
- R15. Default download source is GitHub Releases with environment-variable override

## Scope Boundaries

- No Windows/Linux support (project is macOS ARM64 only today)
- No Ollama or LLM model auto-installation
- No code-signing or notarization changes
- No auto-update mechanism for binaries/models after first install

## Context & Research

### Relevant Code and Patterns

- `src/main/services/download.ts` — Resume-capable downloader (`downloadModels`, `checkModelsExist`). Accepts a `DownloadConfig` with `ModelFile[]`. Each file has `url`, `localPath`, `size`, `sha256`, `executable`.
- `src/main/services/servers.ts` — Already contains `checkSoxTools()`, `findSoxTool()`, `checkBinaryExists()`, `resolveBin()`. Spawns TTS/ASR servers after verifying binaries and models exist.
- `src/main/ipc/channels.ts` — IPC handlers `models:check` and `models:download`. `getDownloadConfig()` currently reads URLs from environment variables only.
- `src/renderer/src/App.tsx` — Startup flow: `checkModels()` → if missing show `DownloadScreen` and call `startDownload()`. Screen states: `loading` | `download` | `onboarding` | `conversation`.
- `src/preload/index.ts` / `index.d.ts` — Exposes `window.api` with `checkModels`, `startDownload`, `startServices`, plus progress/error subscriptions.

### Existing Download Sources

From `INSTALL.md`:

- TTS binary + model: `second-state/kitten_tts_rs` GitHub releases
- ASR binary + model: `second-state/qwen3_asr_rs` (binary via release, model via install.sh)

### Institutional Learnings

- None relevant in `docs/solutions/`.

## Key Technical Decisions

- **GitHub Releases as canonical source**: Zero hosting cost; matches existing manual install instructions. Asset URLs derived from a hardcoded release tag.
- **Environment variables remain as overrides**: Keeps backward compatibility for developers and CI; new users get defaults.
- **Script reuses download URLs from the app**: Single source of truth for release URLs. The script sources a shared config or hardcodes the same values.
- **Cancellation via AbortController**: Wraps the Node.js HTTP request so the user can abort mid-download without leaving corrupt partial files.

## Open Questions

### Resolved During Planning

- **Where do default URLs live?** A new `src/main/services/releases.ts` exports a `ReleaseManifest` with platform-specific asset URLs and expected SHA-256 hashes. `getDownloadConfig()` falls back to this manifest when env vars are absent.
- **How to detect espeak-ng?** Same pattern as `findSoxTool`: `which espeak-ng`, then fall back to `/opt/homebrew/bin/espeak-ng` and `/usr/local/bin/espeak-ng`.
- **How to detect Ollama?** HTTP GET to `http://localhost:11434/api/tags` with a short timeout. Any successful response means Ollama is running; we do not verify the model is pulled.

### Deferred to Implementation

- **Exact release tag and asset names for GitHub URLs**: Need to verify actual release asset names in `second-state/kitten_tts_rs` and `second-state/qwen3_asr_rs`.
- **SHA-256 hashes for integrity checking**: Optional for first pass; can be added later.
- **espeak-ng detection on Apple Silicon Homebrew path edge cases**: Verify if `espeak-ng` is always at `/opt/homebrew/bin/` on M-series Macs.

## High-Level Technical Design

> _This illustrates the intended approach and is directional guidance for review, not implementation specification._

### Startup State Machine

```
loading
  → deps-setup     (SoX or espeak-ng missing)
  → download       (binary or model missing)
  → onboarding     (first launch, all deps ready)
  → conversation   (returning user, all deps ready)
```

Transitions:

- `deps-setup` → user clicks "Done" → re-check → if still missing stay, else go to `download` or `onboarding`/`conversation`
- `download` → download completes → auto-start services → `onboarding`/`conversation`
- `download` → user clicks "Cancel" → stay on `download` with paused state, allow resume

### Dependency Check Order (main process)

1. `checkSystemDeps()` — returns `{ sox: boolean, espeakNg: boolean, ollama: boolean }`
2. `checkBinariesAndModels()` — reuses existing `checkModelsExist()`
3. If (1) has false values → send to renderer for `deps-setup` screen
4. If (2) has false values → send to renderer for `download` screen, then auto-download
5. If all pass → `startServicesInternal()`

## Implementation Units

- [ ] **Unit 1: Default Release Manifest**

**Goal:** Provide hardcoded GitHub Releases download URLs so the app can download without environment variables.

**Requirements:** R5, R6, R15

**Dependencies:** None

**Files:**

- Create: `src/main/services/releases.ts`
- Modify: `src/main/ipc/channels.ts`

**Approach:**

- Define a `ReleaseManifest` type mapping asset names to `{ url, size, sha256? }`.
- Populate with macOS ARM64 assets from `second-state/kitten_tts_rs` and `second-state/qwen3_asr_rs` releases.
- Update `getDownloadConfig()` in `channels.ts` to fall back to the manifest when env vars are absent.
- Keep env vars as highest-priority overrides.

**Patterns to follow:**

- Existing `getDownloadConfig()` structure in `channels.ts`
- Existing `ModelFile` interface in `download.ts`

**Test scenarios:**

- Happy path: With no env vars set, `getDownloadConfig()` returns URLs from the manifest for missing files.
- Edge case: With env vars set, manifest values are ignored.
- Edge case: All files already exist locally → config contains only local-path entries with empty URLs.

**Verification:**

- Temporarily unset all `*_DOWNLOAD_URL` env vars, delete `~/.config/hi-kid/bin` and `models`, run the app, and verify it attempts downloads from GitHub Releases.

---

- [ ] **Unit 2: System Dependency Detection**

**Goal:** Detect SoX, espeak-ng, and Ollama at startup and report structured results to the renderer.

**Requirements:** R3, R7

**Dependencies:** Unit 1

**Files:**

- Create: `src/main/services/deps.ts`
- Modify: `src/main/services/servers.ts`
- Modify: `src/main/ipc/channels.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

**Approach:**

- In `deps.ts`, export `checkSystemDeps()` returning `{ sox: boolean; espeakNg: boolean; ollama: boolean }`.
  - SoX: reuse `findSoxTool('rec')`, `findSoxTool('sox')`, `findSoxTool('play')` from `servers.ts`.
  - espeak-ng: `which espeak-ng` then fallback to `/opt/homebrew/bin/espeak-ng`, `/usr/local/bin/espeak-ng`.
  - Ollama: HTTP GET `http://localhost:11434/api/tags` with 3-second timeout.
- In `servers.ts`, extract the `findSoxTool` / `checkSoxTools` helpers so `deps.ts` can import them cleanly (or move them to `deps.ts` and have `servers.ts` re-export).
- In `channels.ts`, add IPC handler `deps:check` that calls `checkSystemDeps()`.
- In `preload/index.ts` and `index.d.ts`, add `checkDependencies(): Promise<{ sox: boolean; espeakNg: boolean; ollama: boolean }>`.

**Patterns to follow:**

- `findSoxTool` pattern in `servers.ts`
- IPC handler pattern in `channels.ts`

**Test scenarios:**

- Happy path: All three deps installed → returns all `true`.
- Edge case: SoX installed but not espeak-ng → `sox: true, espeakNg: false`.
- Edge case: Ollama not running → `ollama: false`.
- Error path: Network timeout checking Ollama → treat as `false`.

**Verification:**

- DevTools console or manual test: call `window.api.checkDependencies()` and verify correct booleans for each install state.

---

- [ ] **Unit 3: Startup Flow Refactoring & Deps Setup Screen**

**Goal:** Reorder startup so dependency checks happen before model checks, and show a new setup screen when system deps are missing.

**Requirements:** R3, R4, R9

**Dependencies:** Unit 2

**Files:**

- Create: `src/renderer/src/components/DepsSetupScreen.tsx`
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/main/ipc/channels.ts` (startup sequencing)

**Approach:**

- Add `deps-setup` to the `Screen` union type in `App.tsx`.
- Replace the monolithic `checkAndStart` effect with a sequenced async flow:
  1. Call `window.api.checkDependencies()`.
  2. If `sox === false` or `espeakNg === false`, set screen to `deps-setup` and stop.
  3. If Ollama is false, show a non-blocking toast/inline hint (do not block).
  4. Call `window.api.checkModels()`.
  5. If missing, set screen to `download` and call `startDownload()`.
  6. If present, call `startServices()`.
- `DepsSetupScreen` displays:
  - Which tools are missing (SoX, espeak-ng, or both)
  - The exact `brew install sox espeak-ng` command
  - A "Copy command" button
  - A "I've installed them" button that re-runs `checkDependencies()`
- After deps are satisfied, the flow automatically continues to model check/download.

**Patterns to follow:**

- `DownloadScreen` layout and styling in `App.tsx`
- Existing `useState` + `useEffect` patterns

**Test scenarios:**

- Happy path: All deps pre-installed → app goes straight to `download` or `conversation`.
- Happy path: Deps missing → `deps-setup` screen shows; user installs deps, clicks Done → flow continues.
- Edge case: User clicks Done but deps still missing → screen stays, shows updated status.
- Integration: After deps are fixed and models exist, services start automatically without restart.

**Verification:**

- Fresh macOS VM or temporary `mv /opt/homebrew/bin/sox /tmp/` → app shows `deps-setup`. Restore binary → flow continues.

---

- [ ] **Unit 4: Cancellable Downloads**

**Goal:** Allow the user to cancel an in-progress download and resume later.

**Requirements:** R8

**Dependencies:** Unit 1

**Files:**

- Modify: `src/main/services/download.ts`
- Modify: `src/main/ipc/channels.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/components/DownloadScreen.tsx`

**Approach:**

- Add an `AbortSignal` parameter to `downloadFile()` and `downloadModels()`. Pass the signal to the HTTP request and file stream. On abort, destroy the request and close the stream, leaving the `.part` file intact for resume.
- In `channels.ts`, track an `AbortController` instance per download. Add IPC handler `models:download:cancel` that calls `controller.abort()`.
- In `preload`, add `cancelDownload(): Promise<void>`.
- In `DownloadScreen`, add a "Cancel" button that calls `window.api.cancelDownload()`. When cancelled, show "Download paused — click Resume to continue" with a resume button that re-invokes `startDownload()`.

**Patterns to follow:**

- Existing `.part` + `.meta.json` resume mechanism in `download.ts`

**Test scenarios:**

- Happy path: Download runs to completion as before.
- Happy path: User cancels mid-download → `.part` file preserved, no error thrown to renderer.
- Happy path: User clicks Resume → download resumes from `.part` file size via existing Range request logic.
- Edge case: Cancel after download just finished → no-op.

**Verification:**

- Start download, cancel at ~30%, verify `.part` file exists. Resume and verify final file matches expected size.

---

- [ ] **Unit 5: Standalone Install Script**

**Goal:** Provide a shell script that pre-installs all non-Ollama dependencies.

**Requirements:** R10, R11, R12, R13

**Dependencies:** Unit 1

**Files:**

- Create: `scripts/install-dependencies.sh`
- Modify: `package.json` (optional script entry, e.g. `"install:deps": "bash scripts/install-dependencies.sh"`)

**Approach:**

- The script:
  1. Detects macOS ARM64; exits with error on other platforms.
  2. Runs `brew install sox espeak-ng` if missing.
  3. Creates `~/.config/hi-kid/bin` and `~/.config/hi-kid/models`.
  4. Downloads TTS binary, ASR binary, TTS model, ASR model using `curl -L` with progress bar.
  5. Sets executable bits on binaries.
  6. Prints success message and next steps (open HiKid.app, install Ollama).
- Use the same GitHub Releases URLs as the app manifest (hardcoded or sourced from a shared JSON file).
- Include `--help` and `--dry-run` flags for transparency.

**Patterns to follow:**

- Existing `INSTALL.md` manual curl commands
- Homebrew idioms (`brew list` to check installed packages)

**Test scenarios:**

- Happy path: Fresh machine → script installs brew packages and downloads all assets.
- Edge case: Already installed → script detects and skips.
- Error path: Non-macOS platform → clear error message.
- Error path: `curl` fails → script exits non-zero with error message.

**Verification:**

- Run on a clean macOS environment (or temporarily rename `~/.config/hi-kid`), verify all files land in correct directories, then open app and confirm it skips directly to onboarding/conversation.

---

- [ ] **Unit 6: Ollama Informational Prompt**

**Goal:** When Ollama is not detected, show a friendly informational message without blocking the app.

**Requirements:** R7

**Dependencies:** Unit 2, Unit 3

**Files:**

- Modify: `src/renderer/src/App.tsx`

**Approach:**

- During startup sequence (Unit 3), if `ollama === false`, store a transient state flag `showOllamaHint`.
- Display a dismissible toast or inline banner in `conversation` screen (not a blocking modal) that says:
  > "To chat with {aiName}, please install Ollama and run `ollama run qwen3:0.6b`."
- Include a "Copy command" button.
- The hint disappears once the user sends their first message successfully (agent creation succeeds).

**Patterns to follow:**

- Existing `error-toast` styling in `App.tsx`

**Test scenarios:**

- Happy path: Ollama running → no hint shown.
- Happy path: Ollama not running → hint shown in conversation screen.
- Edge case: User dismisses hint → hint stays dismissed for this session.
- Integration: User installs Ollama and sends a message → if agent creation succeeds, hint auto-hides.

**Verification:**

- Stop Ollama, launch app, verify hint appears. Start Ollama, send a message, verify hint disappears.

## System-Wide Impact

- **Interaction graph:** `deps:check` is a new IPC invoke. `models:download:cancel` is a new invoke. `download:progress` subscription is reused.
- **Error propagation:** Download cancellation must not throw unhandled exceptions into the renderer. Abort errors should be caught in `channels.ts` and sent as a calm status message.
- **State lifecycle risks:** If the user cancels download and quits the app, `.part` files remain. The next launch resumes correctly because `download.ts` already reads `.part` file size.
- **API surface parity:** Preload API additions must be mirrored in `index.d.ts`.
- **Unchanged invariants:**
  - `models:check` and `models:download` IPC contracts remain backward compatible.
  - Environment variable overrides continue to work exactly as before.
  - Server startup logic in `startServers()` is untouched except for possible helper reorganization.

## Risks & Dependencies

| Risk                                            | Mitigation                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| GitHub Releases rate-limiting or unavailability | Document fallback to manual install via `INSTALL.md`; env var overrides allow CDN substitution. |
| Asset URL changes in upstream repos             | Pin to a specific release tag rather than `latest`; update manifest with each HiKid release.    |
| espeak-ng not in PATH after Homebrew install    | Detect common Homebrew paths (`/opt/homebrew/bin`, `/usr/local/bin`) explicitly.                |
| Large model download (~2GB) on slow network     | Resume support already exists; cancellation allows pausing and resuming later.                  |
| Script fails on non-standard Homebrew installs  | Script prints detected paths and manual fallback instructions.                                  |

## Documentation / Operational Notes

- Update `INSTALL.md` to describe both paths: (1) open app and follow prompts, (2) run `scripts/install-dependencies.sh` first.
- Update `README.md` quick-start section to mention the script.
- No CI changes required; script is end-user facing.

## Sources & References

- **Origin document:** [docs/brainstorms/simplified-installation-requirements.md](../brainstorms/2026-04-22-simplified-installation-requirements.md)
- Related code: `src/main/services/download.ts`, `src/main/services/servers.ts`, `src/main/ipc/channels.ts`, `src/renderer/src/App.tsx`
- Manual install reference: `INSTALL.md`
