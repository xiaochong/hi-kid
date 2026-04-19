[English](INSTALL.md) | **简体中文**

# HiKid 安装指南

## 系统要求

- **macOS** 12.0+ (Apple Silicon / ARM64)
- **RAM**: 8GB+ (推荐 16GB)
- **存储**: ~2GB（含模型文件）

## 首次运行（重要）

由于 HiKid 未通过 Apple 官方签名，首次打开时 macOS 可能会阻止运行。

**解决方法**（任选一种）：

**方法 1：终端命令（推荐）**

```bash
xattr -cr /Applications/HiKid.app
```

**方法 2：手动允许**

1. 将 `HiKid.app` 拖入 Applications
2. **右键**点击应用图标，选择"打开"
3. 在弹出的对话框中点击"打开"
4. 如果仍被阻止，前往 **系统设置 > 隐私与安全性**，找到 HiKid 并点击"仍要打开"

**方法 3：按住 Control 键打开**

按住 `Control` 键，同时点击应用图标，选择"打开"

---

## 安装步骤

### 1. 安装 SoX（音频工具）

```bash
brew install sox
```

### 2. 安装 TTS / ASR 服务器二进制

```bash
mkdir -p ~/.config/hi-kid/bin && cd ~/.config/hi-kid

# TTS 服务器（macOS ARM64）
curl -LO https://github.com/second-state/kitten_tts_rs/releases/latest/download/kitten-tts-aarch64-macos.tar.gz
tar xzf kitten-tts-aarch64-macos.tar.gz
mv kitten-tts-aarch64-macos/kitten-tts-server bin/
chmod +x bin/kitten-tts-server
rm kitten-tts-aarch64-macos.tar.gz
rmdir kitten-tts-aarch64-macos

# ASR 服务器（macOS ARM64）
curl -sSf https://raw.githubusercontent.com/second-state/qwen3_asr_rs/main/install.sh | bash
mv qwen3_asr_rs/asr-server bin/
chmod +x bin/asr-server
```

### 3. 下载模型文件

```bash
cd ~/.config/hi-kid

# TTS 模型
curl -LO https://github.com/second-state/kitten_tts_rs/releases/latest/download/kitten-tts-models.tar.gz
tar xzf kitten-tts-models.tar.gz
rm kitten-tts-models.tar.gz

# ASR 模型（已包含在 install.sh 安装目录中）
# install.sh 执行后模型位于 ./qwen3_asr_rs/Qwen3-ASR-0.6B/
```

### 4. 运行 HiKid

将 `HiKid.app` 拖入 Applications 文件夹即可使用。

---

## 启动 LLM 后端

HiKid 默认连接本地的 Ollama 服务：

```bash
ollama run qwen3:0.6b
```

如需使用其他 LLM 后端，打开应用内的**设置**面板，直接在里面配置 AI 地址、API 密钥和模型名称即可，无需修改环境变量。

---

## 故障排查

### "Missing required audio tools: rec, sox, play"

SoX 未安装。运行：

```bash
brew install sox
```

### "kitten-tts-server not found"

TTS 服务器二进制文件缺失。按上面第 2 步安装。

### "ASR model not found"

模型文件缺失。按上面第 3 步下载模型，或启动应用后使用内置下载功能。

### 麦克风无响应

前往 **系统设置 > 隐私与安全性 > 麦克风**，确保 HiKid 已授权。
