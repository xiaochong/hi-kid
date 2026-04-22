[English](INSTALL.md) | **简体中文**

# HiKid 安装指南

- **macOS** 12.0+ (Apple Silicon)
- **内存**: 8GB+（推荐 16GB）
- **存储**: ~2GB

---

## 快速开始（推荐）

直接打开 **HiKid.app**，它会自动检测缺少的依赖并引导你安装。二进制文件和模型也会自动下载。

> **首次运行？** 由于未通过 Apple 官方签名，macOS 可能会阻止运行。
> 在终端执行一条命令即可解决：
> ```bash
> xattr -cr /Applications/HiKid.app
> ```

---

## 备选：脚本安装

如果你想在启动前就把所有东西准备好：

```bash
cd /path/to/hi-kid
bash scripts/install-dependencies.sh
```

---

## 启动 LLM 后端

HiKid 默认连接本地 Ollama 服务。

还没有安装 Ollama？前往 [ollama.com](https://ollama.com/download) 下载。

安装后运行：

```bash
ollama run qwen3:0.6b
```

如需使用其他 LLM 后端，打开应用内的**设置**面板直接配置地址、API 密钥和模型名称即可。

---

## 手动安装

仅在需要完全控制文件位置时使用。

<details>
<summary>展开手动步骤</summary>

```bash
# 1. 系统依赖
brew install sox espeak-ng

# 2. 二进制与模型（具体 URL 参考 scripts/install-dependencies.sh）
#    或手动从 GitHub Releases 和 HuggingFace 下载

# 3. 期望的目录结构
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

## 故障排查

| 问题 | 解决 |
| :--- | :--- |
| "Missing audio tools" | `brew install sox` |
| "espeak-ng not found" | `brew install espeak-ng` |
| 找不到 ASR / TTS 服务器 | 启动应用让它自动下载，或运行安装脚本 |
| "Ollama seems to be taking a nap" | 确保 Ollama 在运行：`ollama run qwen3:0.6b` |
| 麦克风无响应 | **系统设置 > 隐私与安全性 > 麦克风** — 开启 HiKid |
