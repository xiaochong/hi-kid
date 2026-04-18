# EchoKid 安装指南

## 系统要求

- **macOS** 12.0+ (Apple Silicon / ARM64)
- **RAM**: 8GB+ (推荐 16GB)
- **存储**: 最小包 ~200MB，全量包 ~2GB

## 首次运行（重要）

由于 EchoKid 未通过 Apple 官方签名，首次打开时 macOS 可能会阻止运行。

**解决方法**（任选一种）：

**方法 1：终端命令（推荐）**

```bash
xattr -cr /Applications/EchoKid.app
```

**方法 2：手动允许**

1. 将 `EchoKid.app` 拖入 Applications
2. **右键**点击应用图标，选择"打开"
3. 在弹出的对话框中点击"打开"
4. 如果仍被阻止，前往 **系统设置 > 隐私与安全性**，找到 EchoKid 并点击"仍要打开"

**方法 3：按住 Control 键打开**

按住 `Control` 键，同时点击应用图标，选择"打开"

---

## 方案一：最小安装包（推荐开发者）

应用体积最小，但需要手动安装依赖。

### 1. 安装 SoX（音频工具）

```bash
brew install sox
```

### 2. 安装 TTS / ASR 服务器二进制

下载以下文件到 `~/.config/echo-kid/bin/`：

| 文件 | 说明 |
|------|------|
| `kitten-tts-server` | TTS 语音合成服务器 |
| `asr-server` | ASR 语音识别服务器 |

并赋予执行权限：

```bash
chmod +x ~/.config/echo-kid/bin/kitten-tts-server
chmod +x ~/.config/echo-kid/bin/asr-server
```

### 3. 下载模型文件

将模型文件放到对应目录：

```
~/.config/echo-kid/models/
  ├── kitten/kitten-tts-micro/
  └── qwen3_asr_rs/Qwen3-ASR-0.6B/
```

### 4. 运行 EchoKid

将 `EchoKid.app` 拖入 Applications 文件夹即可使用。

---

## 方案二：全量安装包（推荐普通用户）

开箱即用，无需手动下载任何依赖。

### 步骤

1. 下载 `EchoKid-x.x.x.dmg`
2. 打开 DMG，将 `EchoKid.app` 拖入 Applications 文件夹
3. 首次启动时前往 **系统设置 > 隐私与安全性 > 麦克风**，允许 EchoKid 访问麦克风
4. 双击启动，开始和 Kitten 对话！

---

## 启动 LLM 后端

EchoKid 默认连接本地的 Ollama 服务：

```bash
ollama run qwen3
```

如果使用其他 LLM 后端，设置环境变量：

```bash
export OPENAI_BASE_URL="http://localhost:11434/v1"
export OPENAI_API_KEY="ollama"
export MODEL_NAME="qwen3"
```

---

## 故障排查

### "Missing required audio tools: rec, sox, play"

SoX 未安装。运行：

```bash
brew install sox
```

### "kitten-tts-server not found"

TTS 服务器二进制文件缺失。按方案一第 2 步安装。

### "ASR model not found"

模型文件缺失。按方案一第 3 步下载模型，或启动应用后使用内置下载功能。

### 麦克风无响应

前往 **系统设置 > 隐私与安全性 > 麦克风**，确保 EchoKid 已授权。
