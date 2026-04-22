**English** | [简体中文](INSTALL-cn.md)

# HiKid Installation

- **macOS** 12.0+ (Apple Silicon)
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: ~2GB

---

## Quick Start (Recommended)

Just open **HiKid.app**. It will detect anything missing and guide you through installing it. Binaries and models are downloaded automatically.

> **First launch?** macOS may block the app because it is not signed by Apple.
> Fix it with one terminal command:
> ```bash
> xattr -cr /Applications/HiKid.app
> ```

---

## Alternative: Script Install

If you prefer to have everything ready before launching:

```bash
cd /path/to/hi-kid
bash scripts/install-dependencies.sh
```

---

## Start the LLM Backend

HiKid connects to a local Ollama service by default.

Don't have Ollama yet? Download it at [ollama.com](https://ollama.com/download).

Once installed, run:

```bash
ollama run qwen3:0.6b
```

To use a different backend, open **Settings** in the app and configure the endpoint, API key, and model name there.

---

## Manual Installation

Only if you want full control over where files go.

<details>
<summary>Expand manual steps</summary>

```bash
# 1. System dependencies
brew install sox espeak-ng

# 2. Binaries & models (see scripts/install-dependencies.sh for exact URLs)
#    Or download manually from GitHub releases and HuggingFace

# 3. Expected layout
~/.config/hi-kid/
  bin/
    kitten-tts-server
    asr-server
    mlx.metallib
  models/
    kitten/kitten-tts-micro/
    qwen3_asr_rs/Qwen3-ASR-0.6B/
```

</details>

---

## Troubleshooting

| Problem | Fix |
| :--- | :--- |
| "Missing audio tools" | `brew install sox` |
| "espeak-ng not found" | `brew install espeak-ng` |
| "ASR / TTS server not found" | Launch the app and let it auto-download, or run the install script |
| "Ollama seems to be taking a nap" | Make sure Ollama is running: `ollama run qwen3:0.6b` |
| Microphone not responding | **System Settings > Privacy & Security > Microphone** — enable HiKid |
