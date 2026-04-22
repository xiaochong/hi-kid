#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[info]${NC}  $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}    $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

# ── 1. Platform check ───────────────────────────────────────────────
if [[ "$(uname -s)" != "Darwin" ]]; then
  err "This script only supports macOS."
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  err "This script only supports Apple Silicon (ARM64)."
  exit 1
fi

# ── 2. Config ───────────────────────────────────────────────────────
HI_KID_DIR="${HOME}/.config/hi-kid"
BIN_DIR="${HI_KID_DIR}/bin"
MODELS_DIR="${HI_KID_DIR}/models"

KITTEN_TAG="v0.2.2"
ASR_TAG="v0.2.0"

# ── 3. Install Homebrew packages ────────────────────────────────────
info "Checking system dependencies..."

need_brew=()
if ! command -v rec &>/dev/null && ! [[ -f /opt/homebrew/bin/rec ]]; then
  need_brew+=(sox)
fi
if ! command -v espeak-ng &>/dev/null && ! [[ -f /opt/homebrew/bin/espeak-ng ]]; then
  need_brew+=(espeak-ng)
fi

if [[ ${#need_brew[@]} -gt 0 ]]; then
  info "Installing: ${need_brew[*]}"
  brew install "${need_brew[@]}"
else
  ok "SoX and espeak-ng are already installed"
fi

# ── 4. Create directories ───────────────────────────────────────────
mkdir -p "${BIN_DIR}"
mkdir -p "${MODELS_DIR}/kitten"
mkdir -p "${MODELS_DIR}/qwen3_asr_rs/Qwen3-ASR-0.6B"

# ── 5. Download TTS server binary ───────────────────────────────────
if [[ ! -f "${BIN_DIR}/kitten-tts-server" ]]; then
  info "Downloading TTS server..."
  curl -fSL -o /tmp/kitten-tts.tar.gz \
    "https://github.com/second-state/kitten_tts_rs/releases/download/${KITTEN_TAG}/kitten-tts-aarch64-macos.tar.gz"
  tar -xzf /tmp/kitten-tts.tar.gz -C /tmp
  mv /tmp/kitten-tts-aarch64-macos/kitten-tts-server "${BIN_DIR}/"
  chmod +x "${BIN_DIR}/kitten-tts-server"
  rm -rf /tmp/kitten-tts.tar.gz /tmp/kitten-tts-aarch64-macos
  ok "TTS server installed"
else
  ok "TTS server already exists"
fi

# ── 6. Download TTS model ───────────────────────────────────────────
if [[ ! -d "${MODELS_DIR}/kitten/kitten-tts-micro" ]]; then
  info "Downloading TTS model (~166 MB)..."
  curl -fSL -o /tmp/kitten-tts-models.tar.gz \
    "https://github.com/second-state/kitten_tts_rs/releases/download/${KITTEN_TAG}/kitten-tts-models.tar.gz"
  tar -xzf /tmp/kitten-tts-models.tar.gz -C /tmp
  mv /tmp/models/kitten-tts-micro "${MODELS_DIR}/kitten/"
  rm -rf /tmp/kitten-tts-models.tar.gz /tmp/models
  ok "TTS model installed"
else
  ok "TTS model already exists"
fi

# ── 7. Download ASR server binary ───────────────────────────────────
if [[ ! -f "${BIN_DIR}/asr-server" ]]; then
  info "Downloading ASR server..."
  curl -fSL -o /tmp/asr.zip \
    "https://github.com/second-state/qwen3_asr_rs/releases/download/${ASR_TAG}/asr-macos-aarch64.zip"
  unzip -q /tmp/asr.zip -d /tmp
  mv /tmp/asr-macos-aarch64/asr-server "${BIN_DIR}/"
  mv /tmp/asr-macos-aarch64/mlx.metallib "${BIN_DIR}/"
  chmod +x "${BIN_DIR}/asr-server"
  rm -rf /tmp/asr.zip /tmp/asr-macos-aarch64
  ok "ASR server installed"
else
  ok "ASR server already exists"
fi

# ── 8. Download ASR model from HuggingFace ──────────────────────────
ASR_MODEL_DIR="${MODELS_DIR}/qwen3_asr_rs/Qwen3-ASR-0.6B"
HF_BASE="https://huggingface.co/Qwen/Qwen3-ASR-0.6B/resolve/main"

if [[ ! -f "${ASR_MODEL_DIR}/config.json" ]]; then
  info "Downloading ASR model config..."
  curl -fSL -o "${ASR_MODEL_DIR}/config.json" "${HF_BASE}/config.json"
  ok "ASR config downloaded"
else
  ok "ASR config already exists"
fi

if [[ ! -f "${ASR_MODEL_DIR}/model.safetensors" ]]; then
  info "Downloading ASR model weights (~1.75 GB, this may take a while)..."
  curl -fSL -o "${ASR_MODEL_DIR}/model.safetensors" "${HF_BASE}/model.safetensors"
  ok "ASR weights downloaded"
else
  ok "ASR weights already exist"
fi

# Tokenizer: re-extract from ASR release zip if needed
if [[ ! -f "${ASR_MODEL_DIR}/tokenizer.json" ]]; then
  info "Extracting ASR tokenizer..."
  curl -fSL -o /tmp/asr-tokenizer.zip \
    "https://github.com/second-state/qwen3_asr_rs/releases/download/${ASR_TAG}/asr-macos-aarch64.zip"
  unzip -j -q /tmp/asr-tokenizer.zip "asr-macos-aarch64/tokenizers/tokenizer-0.6B.json" -d /tmp
  mv /tmp/tokenizer-0.6B.json "${ASR_MODEL_DIR}/tokenizer.json"
  rm -f /tmp/asr-tokenizer.zip
  ok "ASR tokenizer installed"
else
  ok "ASR tokenizer already exists"
fi

# ── 9. Done ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} All dependencies installed!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "You can now open HiKid.app."
echo ""
echo "Note: To chat with the AI, you still need to:"
echo "  1. Install Ollama: https://ollama.com"
echo "  2. Run: ollama run qwen3:0.6b"
echo ""
