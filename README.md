**English** | [简体中文](README-cn.md)

# 🎈 HiKid

> *Hi! I'm your AI English Pal. Let's talk!*

[![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 🌟 What is this?

HiKid is a **completely free, forever free** open-source desktop app designed for **kids in non-English-speaking countries** to practice English speaking and listening.

Say "Hello" into the microphone, and it will chat with you in English, tell stories, and play word games — all completely offline. All data and AI run locally on your machine, nothing is uploaded to the cloud.

- 🗣️ **Just start talking** — no typing needed, speak directly and the AI understands
- 🧠 **Smart and patient** — talk about anything, it doesn't matter if you speak slowly or simply
- 🎨 **Looks like a cartoon** — cute interface that kids will love
- 🔒 **Privacy safe** — conversations, voice, and models all run locally
- 🌏 **Works without internet** — recording, recognition, synthesis, and dialogue all run through a local pipeline

> 🍎 **Currently macOS only.** Windows and Linux versions are planned — contributions welcome!

![](resources/preview1.png)

![](resources/preview2.png)

## 🚀 Quick Start

### Requirements

- macOS 12.0+ (Apple Silicon / Intel)
- Node.js >= 20
- npm

### Install

```bash
# 1. Clone the repo
git clone https://github.com/xiaochong/hi-kid.git
cd hi-kid

# 2. Install dependencies
npm install
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# Type check
npm run typecheck

# Format code
npm run format
```

### Build

```bash
# All platforms
npm run build

# macOS
npm run build:mac

# Unpacked output (no installer)
npm run build:unpack
```

> For detailed external dependency installation (SoX, ASR/TTS servers, model files, etc.), see [INSTALL.md](INSTALL.md).

## 🏗️ Architecture

HiKid's voice conversation runs through a complete **local pipeline**:

```
User speaks → SoX(rec) recording + VAD detection ──→ ASR server speech-to-text
                                                  ↓
SoX(play) plays PCM audio ←─ TTS server speech synthesis ←─ LLM generates reply
```

| Component | Role |
|-----------|------|
| **SoX** | Audio recording, playback, format conversion, and analysis |
| **kitten-tts-server** | Local text-to-speech (TTS), streams PCM over SSE |
| **asr-server** | Local automatic speech recognition (ASR), based on Qwen3-ASR-0.6B |
| **Ollama** | Local large language model, default `qwen3:0.6b` |

Project structure:

```
src/
├── main/          # Electron main process
├── preload/       # Preload scripts (IPC bridge)
└── renderer/      # React renderer process
```

## 🤝 Contributing

Issues and PRs are welcome!

- `dev` is the active development branch
- `main` is the stable branch for merging PRs
- Please run `npm run lint` and `npm run typecheck` before submitting

## 🙏 Acknowledgments

HiKid stands on the shoulders of giants:

| Project | Purpose |
|---------|---------|
| [Electron](https://www.electronjs.org/) | Cross-platform desktop app framework |
| [React](https://react.dev/) | UI building |
| [Vite](https://vitejs.dev/) | Fast build tool |
| [@mariozechner/pi-agent-core](https://www.npmjs.com/package/@mariozechner/pi-agent-core) | Agent orchestration and event streaming framework |
| [kitten-tts-server](https://github.com/second-state/kitten_tts_rs) | Local speech synthesis engine |
| [Qwen3-ASR-0.6B](https://github.com/QwenLM/Qwen3) | Local speech recognition model |
| [Ollama](https://ollama.com/) | Local LLM runtime |
| [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) | Cute UI components |

And to all the developers who indirectly depend on them — thank you for making the open-source world so wonderful!

## ⚠️ Disclaimer

- This project is for personal learning, research, and non-commercial demonstration only. Commercial use, resale, or profit-making in any form is prohibited.
- The UI component library [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) used by this project draws visual design inspiration from classic game styles, but all materials and styles are for design reference only and do not constitute copying or infringement of the original works.

## 📄 License

MIT

---

<p align="center">
  Made with 💛 for kids around the world
</p>
