**English** | [简体中文](INSTALL-cn.md)

# HiKid Installation Guide

## System Requirements

- **macOS** 12.0+ (Apple Silicon / ARM64)
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: ~2GB (including model files)

## First Launch (Important)

Since HiKid is not signed by Apple, macOS may block it on first open.

**Workarounds** (pick one):

**Method 1: Terminal command (recommended)**

```bash
xattr -cr /Applications/HiKid.app
```

**Method 2: Manually allow**

1. Drag `HiKid.app` into Applications
2. **Right-click** the app icon and choose "Open"
3. Click "Open" in the dialog that appears
4. If still blocked, go to **System Settings > Privacy & Security**, find HiKid, and click "Open Anyway"

**Method 3: Control-click to open**

Hold the `Control` key and click the app icon, then choose "Open"

---

## Installation Steps

### 1. Install SoX (audio tools)

```bash
brew install sox
```

### 2. Install espeak-ng (TTS dependency)

```bash
brew install espeak-ng
```

### 3. Install TTS / ASR server binaries

```bash
mkdir -p ~/.config/hi-kid/bin && cd ~/.config/hi-kid

# TTS server (macOS ARM64)
curl -LO https://github.com/second-state/kitten_tts_rs/releases/latest/download/kitten-tts-aarch64-macos.tar.gz
tar xzf kitten-tts-aarch64-macos.tar.gz
mv kitten-tts-aarch64-macos/kitten-tts-server bin/
chmod +x bin/kitten-tts-server
rm kitten-tts-aarch64-macos.tar.gz
rmdir kitten-tts-aarch64-macos

# ASR server (macOS ARM64)
curl -sSf https://raw.githubusercontent.com/second-state/qwen3_asr_rs/main/install.sh | bash
mv qwen3_asr_rs/asr-server bin/
mv qwen3_asr_rs/mlx.metallib bin/
chmod +x bin/asr-server
```

### 4. Download model files

```bash
cd ~/.config/hi-kid

# TTS model
curl -LO https://github.com/second-state/kitten_tts_rs/releases/latest/download/kitten-tts-models.tar.gz
tar xzf kitten-tts-models.tar.gz
rm kitten-tts-models.tar.gz

# The archive extracts to models/kitten-tts-micro/, but the app expects models/kitten/kitten-tts-micro/
mkdir -p models/kitten
mv models/kitten-tts-micro models/kitten/

# ASR model (already included in the install.sh directory)
# After install.sh runs, models are at ./qwen3_asr_rs/Qwen3-ASR-0.6B/
mv qwen3_asr_rs models/
```

### 5. Run HiKid

Drag `HiKid.app` into your Applications folder and launch.

---

## Start the LLM Backend

HiKid connects to a local Ollama service by default:

```bash
ollama run qwen3:0.6b
```

To use a different LLM backend, open **Settings** in the app and configure the AI endpoint, API key, and model name there — no environment variables needed.

---

## Troubleshooting

### "Missing required audio tools: rec, sox, play"

SoX is not installed. Run:

```bash
brew install sox
```

### "espeak-ng not found" or TTS server fails to start

espeak-ng is not installed. Run:

```bash
brew install espeak-ng
```

### "kitten-tts-server not found"

The TTS server binary is missing. Install it following Step 3 above.

### "ASR model not found"

Model files are missing. Download them following Step 4 above, or use the built-in download feature after launching the app.

### Microphone not responding

Go to **System Settings > Privacy & Security > Microphone** and make sure HiKid is authorized.
