# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EchoKid - Your AI English Pal. An Electron desktop app built with React and TypeScript, targeting children in non-English-speaking countries who want to practice English speaking and listening.

## Tech Stack

- **Framework:** Electron with [electron-vite](https://electron-vite.org/)
- **Frontend:** React 19 + TypeScript 5.9 + Vite 7
- **Package Manager:** npm
- **Linting:** ESLint 9 (flat config) with React, Hooks, and Refresh plugins
- **Formatting:** Prettier (`singleQuote: true`, `semi: false`, `printWidth: 100`, `trailingComma: none`)

## Common Commands

```bash
# Install dependencies
npm install

# Development with HMR
npm run dev

# Production preview
npm start

# Type checking
npm run typecheck          # Check all
npm run typecheck:node     # Main + preload only
npm run typecheck:web      # Renderer only

# Linting and formatting
npm run lint               # ESLint with cache
npm run format             # Prettier --write

# Building
npm run build              # Type-check + electron-vite build
npm run build:mac          # Build + package for macOS
npm run build:win          # Build + package for Windows
npm run build:linux        # Build + package for Linux
npm run build:unpack       # Build as unpacked directory
```

## Architecture

The project follows the standard **electron-vite** three-process architecture:

- **`src/main/`** — Electron main process (Node.js). Entry at `index.ts`. Handles `BrowserWindow` creation, app lifecycle, and IPC listeners.
- **`src/preload/`** — Preload scripts using `contextBridge` to safely expose APIs to the renderer. `index.ts` exposes `electronAPI` (window control) and `api` (custom APIs). `index.d.ts` contains type declarations for the global window interface.
- **`src/renderer/src/`** — React SPA running in the renderer process. Entry at `main.tsx`, root component at `App.tsx`.

**Path alias:** `@renderer` maps to `src/renderer/src/`, configured in `electron.vite.config.ts` and `tsconfig.web.json`.

**Build output:** Compiled artifacts go to `out/` (main, preload, and renderer bundles).

## IPC Pattern

The preload script exposes APIs via `contextBridge.exposeInMainWorld`. When adding new IPC channels:

1. Define the channel and API in `src/preload/index.ts`
2. Add types to `src/preload/index.d.ts`
3. Handle the IPC in `src/main/index.ts`
4. Consume it in the renderer via `window.api.*`

## Notes

- **No test framework is configured.** There are no unit or e2e tests yet.
- The project is at a very early stage (single init commit). Core AI/English-learning features are not yet implemented.
- `electron-builder.yml` still contains template defaults (`productName: electron-app-demo1`). Update when ready for distribution.
- The `dev` branch is the active development branch; `main` is the default branch for PRs.