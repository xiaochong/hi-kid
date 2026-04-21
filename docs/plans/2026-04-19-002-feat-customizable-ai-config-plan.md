---
title: 'feat: Add customizable AI config with settings panel'
type: feat
status: active
date: 2026-04-19
origin: docs/brainstorms/2026-04-19-hikid-customizable-ai-config-requirements.md
---

# feat: Add customizable AI config with settings panel

## Overview

Add a user-facing settings panel that allows customizing the AI's name, system prompt, and LLM connection parameters (base URL, API key, model name). Configuration is persisted to a JSON file in the existing `~/.config/hi-kid/` directory and exposed to the renderer via IPC. LLM parameter changes trigger an automatic Agent rebuild.

## Problem Frame

Currently the AI name ("Kitten"), system prompt, and all LLM connection parameters are hardcoded in source. Users cannot customize the AI's persona or switch to a different LLM provider without rebuilding the app. This feature makes HiKid adaptable to different user preferences and deployment environments.

(see origin: docs/brainstorms/2026-04-19-hikid-customizable-ai-config-requirements.md)

## Requirements Trace

- R1. AI name customizable (default "Kitten")
- R2. System prompt customizable (default hardcoded prompt)
- R3-R5. LLM base URL, API key, model name customizable
- R6-R8. Config stored in `~/.config/hi-kid/config.json` with atomic writes, version field, 0o600 permissions
- R8b. Corrupted config falls back to defaults
- R9-R13. SettingsPanel UI with form, save button, toast feedback
- R10a. Input validation (AI name <=32 chars, model name <=128 chars)
- R12a. Agent unsubscribe before rebuild
- R14. System prompt changes take effect on next conversation turn
- R15. LLM param changes rebuild Agent (history not preserved)
- R16. UI text dynamically renders configured AI name

## Scope Boundaries

- No config import/export
- No config preset templates
- No multi-profile switching
- No config encryption or password protection
- No automatic provider availability detection
- TTS server config (port, model path) remains env-var only for this iteration

## Context & Research

### Relevant Code and Patterns

- **IPC pattern (4-step):** `src/preload/index.ts` exposes API -> `src/preload/index.d.ts` declares types -> `src/main/ipc/channels.ts` registers handlers -> renderer consumes via `window.api.*`
- **File I/O:** `src/main/ipc/channels.ts` already uses `fs`, `path`, `os` for `~/.config/hi-kid/` directory operations
- **Agent lifecycle:** `src/main/services/agent.ts` exports `createAgent(config)`, `getAgent()`, `resetAgent()`. The agent is a singleton recreated in `startServicesInternal()`
- **Local state persistence:** Renderer uses `localStorage` for simple flags (`MODE_KEY`, `TEXT_ENABLED_KEY`); complex config lives in main-process files fetched via IPC
- **SettingsPanel:** `src/renderer/src/components/SettingsPanel.tsx` is a compact mode-toggle bar (`press-and-hold` vs `vad`). It will be extended with a config entry point
- **CSS Modules:** Components use co-located `.module.css` files

### Institutional Learnings

No `docs/solutions/` directory exists. This is the second feature plan after voice conversation integration.

## Key Technical Decisions

- **Config file path:** Reuse the existing `os.homedir() + '.config/hi-kid'` convention already used for model files. On Windows this resolves to `%APPDATA%\hi-kid\`.
- **Config priority:** `config.json` > environment variables > hardcoded defaults. Env vars serve as dev-time overrides.
- **SettingsPanel interaction:** A gear icon next to the mode toggles opens a dropdown panel below the settings bar (following the existing `TopicSuggestions` dropdown pattern in `App.tsx`). This avoids adding a new screen or modal while keeping the header compact.
- **Agent rebuild on LLM change:** `stopSpeaking()` -> `agent.abort()` -> create new Agent with new config. The TTS queue (`ttsQueue` Promise chain) may outlive the abort; this is accepted as a known edge case for this iteration.
- **System prompt immediate effect:** pi-agent-core reads `systemPrompt` at the start of each conversation turn via `createContextSnapshot()`. Changes therefore take effect on the _next_ turn, not the current in-flight turn.

## Open Questions

### Resolved During Planning

- **SettingsPanel interaction mode:** Gear icon + dropdown panel (follows existing `TopicSuggestions` dropdown pattern)
- **Config precedence:** config.json > env vars > defaults
- **Conversation history on LLM rebuild:** Not preserved (clean start)

### Deferred to Implementation

- **Agent unsubscribe mechanism:** The `@mariozechner/pi-agent-core` `Agent` class may or may not expose an `unsubscribe()` method. If not available, the old agent reference is overwritten and garbage collected. Verify at implementation time.
- **TTS queue race during rebuild:** The `ttsQueue` Promise chain in `createTtsStreamFn` may continue executing after `agent.abort()`. If this causes state confusion, add an abort flag check in the queue.
- **Toast component:** The app currently only has error-toast in `App.tsx`. Either reuse that pattern with success styling or create a lightweight toast utility.

## Implementation Units

- [ ] **Unit 1: Config Service (main process)**

**Goal:** Add config file read/write with defaults, validation, and atomic writes.

**Requirements:** R6, R7, R8, R8a, R8b, R10a

**Dependencies:** None

**Files:**

- Create: `src/main/services/config.ts`

**Approach:**

- Define `AppConfig` interface with all configurable fields plus `version: number`
- `loadConfig()` reads `~/.config/hi-kid/config.json`, merges with defaults, validates fields
- `saveConfig()` writes to temp file then renames for atomicity
- `getDefaultConfig()` returns the fallback values
- On read error or invalid JSON, log and return defaults
- On write, ensure directory exists, set file mode to 0o600

**Patterns to follow:**

- Existing `fs`/`path`/`os` usage in `channels.ts` for directory operations

**Test scenarios:**

- Happy path: Read valid config -> returns parsed values
- Edge case: Missing config file -> returns defaults and creates file
- Error path: Corrupted JSON -> returns defaults, logs error, regenerates file
- Edge case: Empty AI name in config -> falls back to "Kitten"

**Verification:**

- `loadConfig()` returns correct defaults when file is missing
- `saveConfig()` creates a readable JSON file at the expected path
- Corrupted config triggers fallback without crashing

---

- [ ] **Unit 2: IPC Channels for Config**

**Goal:** Expose config read/write and change notifications to the renderer.

**Requirements:** R6, R12

**Dependencies:** Unit 1

**Files:**

- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`
- Modify: `src/main/ipc/channels.ts`

**Approach:**

- Add `config:get` invoke: returns current config from main process
- Add `config:set` invoke: validates and saves config, then notifies renderer
- Add `config:changed` subscription: main pushes config updates to renderer after save
- Update `preload/index.d.ts` with new method signatures on `Window.api`

**Patterns to follow:**

- Existing invoke/subscription pattern (see `services:start`, `onServiceStatus`)

**Test scenarios:**

- Happy path: Renderer calls `window.api.getConfig()` -> receives config object
- Happy path: Renderer calls `window.api.setConfig(newConfig)` -> config is saved and `config:changed` fires
- Error path: Invalid config (e.g. empty baseUrl) -> rejected with error message

**Verification:**

- DevTools console can call `window.api.getConfig()` and see the config object
- Changing a value via `setConfig` updates the file on disk

---

- [ ] **Unit 3: Agent Refactor for Dynamic Config**

**Goal:** Make `createAgent` accept dynamic system prompt and AI name; support recreation.

**Requirements:** R1, R2, R12a, R14, R15

**Dependencies:** Unit 1

**Files:**

- Modify: `src/main/services/agent.ts`
- Modify: `src/main/ipc/channels.ts`

**Approach:**

- Update `AgentConfig` interface to include `aiName` and `systemPrompt`
- Update `createAgent` to accept `aiName` and inject it into the system prompt template
- Add `recreateAgent()` helper that calls `stopSpeaking()`, aborts current agent, then creates new one
- In `channels.ts`, replace module-level `const` LLM config with a function that reads from config service

**Patterns to follow:**

- Existing `createAgent`/`getAgent`/`resetAgent` singleton pattern

**Technical design:**
The system prompt template currently hardcodes "Kitten". With dynamic names, the prompt should interpolate the configured name. A simple approach is to replace "named Kitten" with `named ${config.aiName}` in the default prompt, or allow the user to write a fully custom prompt where they can reference the name if desired.

**Test scenarios:**

- Happy path: Create agent with custom name -> system prompt contains the custom name
- Happy path: Create agent with custom system prompt -> prompt is used verbatim
- Integration: `recreateAgent()` stops TTS and creates a new agent instance
- Edge case: Recreate while agent is thinking -> old stream is aborted cleanly

**Verification:**

- Agent responds using the configured name in conversation
- Changing LLM params and saving triggers agent recreation

---

- [ ] **Unit 4: SettingsPanel UI Extension**

**Goal:** Add config editing form to the settings panel with save and feedback.

**Requirements:** R9, R10, R10a, R11, R12, R13, R13a

**Dependencies:** Unit 2

**Files:**

- Modify: `src/renderer/src/components/SettingsPanel.tsx`
- Modify: `src/renderer/src/components/SettingsPanel.module.css`
- Create: `src/renderer/src/hooks/useConfig.ts`

**Approach:**

- Add a gear icon button to the right of the mode toggles in `SettingsPanel`
- Clicking the gear opens a dropdown panel below with a form
- Form fields: AI Name (text), System Prompt (textarea), Base URL (text), API Key (text), Model Name (text)
- Use `useConfig` hook to fetch config on mount and manage form state
- Save button calls `window.api.setConfig()` and shows a success toast
- Validation: AI name max 32 chars, model name max 128 chars, base URL must be valid URL format
- Escape key closes the panel; click outside also closes

**Patterns to follow:**

- `TopicSuggestions` dropdown pattern in `App.tsx` (click outside to close)
- Existing `SettingsPanel.module.css` for styling

**Test scenarios:**

- Happy path: Open settings, change AI name, save -> toast appears, name updates
- Edge case: Enter invalid URL -> inline error, save disabled
- Edge case: Enter empty AI name -> falls back to "Kitten" on save
- Error path: Save fails (IPC error) -> error toast displayed
- Integration: Change LLM params -> main process recreates agent, UI shows brief "reconnecting" state

**Verification:**

- Form opens and closes correctly
- All 5 fields can be edited and saved
- Invalid input prevents save with clear feedback
- Success toast appears after save

---

- [ ] **Unit 5: Dynamic AI Name in UI**

**Goal:** Replace all hardcoded "Kitten" references with dynamic config-driven names.

**Requirements:** R16

**Dependencies:** Unit 2, Unit 4

**Files:**

- Modify: `src/renderer/src/components/OnboardingScreen.tsx`
- Modify: `src/renderer/src/components/ChatBubbles.tsx`
- Modify: `src/renderer/src/components/DownloadScreen.tsx`
- Modify: `src/renderer/src/App.tsx`

**Approach:**

- `OnboardingScreen`: Accept `aiName` prop, render `Hi, I am {aiName}!`
- `ChatBubbles`: Accept `aiName` prop, render `Say hello to {aiName}` in empty state
- `DownloadScreen`: Accept `aiName` prop, replace "Kitten is..." messages with `{aiName} is...`
- `App.tsx`: Fetch config on mount, pass `aiName` to child components

**Patterns to follow:**

- Props drilling pattern already used in the component tree

**Test scenarios:**

- Happy path: Change AI name in settings -> onboarding screen shows new name immediately
- Happy path: Chat bubbles empty state shows configured name
- Happy path: Download screen messages use configured name
- Edge case: Very long AI name -> should not break layout (CSS overflow handling)

**Verification:**

- All three screens display the configured AI name
- Name change in settings is reflected without app restart

---

- [ ] **Unit 6: Integration and Agent Rebuild Wiring**

**Goal:** Wire config changes through the full stack: save -> IPC -> agent recreation -> UI update.

**Requirements:** R12, R12a, R15

**Dependencies:** Unit 1, Unit 2, Unit 3, Unit 4, Unit 5

**Files:**

- Modify: `src/main/ipc/channels.ts`
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/hooks/useConversation.ts` (if needed for state reset)

**Approach:**

- In `channels.ts`, when `config:set` is called:
  1. Validate and save config via config service
  2. If LLM params changed, call `recreateAgent()` with new config
  3. Broadcast `config:changed` to renderer
- In `App.tsx`, listen for `config:changed` and update local `aiName` state
- When Agent is recreated, clear conversation messages (history not preserved per R15)
- Show a brief status message during rebuild (e.g. "Reconnecting to AI...")

**Patterns to follow:**

- Existing `sendToRenderer` pattern for main->renderer events
- Existing `services:status` event flow for service state changes

**Test scenarios:**

- Happy path: Save new LLM params -> agent reconnects, conversation clears, can talk to new model
- Happy path: Save only AI name -> no agent rebuild, name updates instantly in UI
- Happy path: Save only system prompt -> next conversation turn uses new prompt
- Error path: Invalid LLM params (unreachable URL) -> error toast, agent stays on old config
- Integration: Change config while agent is speaking -> speaking stops, agent rebuilds

**Verification:**

- Full round-trip: edit config -> save -> file updates -> agent uses new params -> UI reflects changes
- Changing only name does not interrupt conversation
- Changing LLM params clears conversation history

## System-Wide Impact

- **Interaction graph:** Config changes flow: renderer form -> `config:set` IPC -> config service saves file -> optional agent recreate -> `config:changed` broadcast -> renderer updates UI
- **Error propagation:** Config validation errors returned via IPC rejections and displayed as toasts. Agent rebuild failures show fairy-tale error messages via existing `sendFairyTaleError`.
- **State lifecycle risks:** Agent rebuild discards conversation history. The renderer's `messages` state must be cleared to stay consistent.
- **API surface parity:** The preload API gains `getConfig`, `setConfig`, and `onConfigChanged`. These must be kept in sync between `preload/index.ts` and `preload/index.d.ts`.
- **Unchanged invariants:** TTS/ASR server lifecycle, recording pipeline, VAD auto-restart, mode toggle, and localStorage-based flags (`MODE_KEY`, `TEXT_ENABLED_KEY`) are not affected.

## Risks & Dependencies

| Risk                                                 | Mitigation                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| pi-agent-core Agent may not support `unsubscribe()`  | Verify at implementation; if absent, rely on reference overwrite and GC         |
| TTS queue continues after agent abort during rebuild | Accepted for this iteration; add abort flag if it causes UX issues              |
| Invalid LLM config leaves app in broken state        | Validate before save; on rebuild failure, keep old agent running and show error |
| Config file corruption on crash during write         | Atomic write (temp+rename) mitigates this; fallback to defaults on read error   |

## Documentation / Operational Notes

- No CI/CD changes required
- No migration needed (new feature, no existing config to migrate)
- Future config additions should increment the `version` field in config.json

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-19-hikid-customizable-ai-config-requirements.md](../brainstorms/2026-04-19-hikid-customizable-ai-config-requirements.md)
- Related code: `src/main/services/agent.ts`, `src/main/ipc/channels.ts`, `src/preload/index.ts`, `src/renderer/src/components/SettingsPanel.tsx`
- Related plan: `docs/plans/2026-04-18-001-feat-voice-conversation-integration-plan.md`
