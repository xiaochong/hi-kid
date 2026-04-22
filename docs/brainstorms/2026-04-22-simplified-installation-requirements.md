---
date: 2026-04-22
topic: simplified-installation
---

# Simplified Installation

## Problem Frame

HiKid 的目标用户是儿童，由家长完成安装。当前安装过程要求家长执行多个手动步骤（brew install、curl 下载二进制、curl 下载模型），门槛过高。与此同时，ASR/TTS 模型文件总计约 2GB，不适合打包进安装包。

本需求旨在提供两条并行的安装路径：

1. **主线**：打开 App 后自动检测缺失依赖并引导/下载
2. **辅助**：独立脚本供技术型家长提前装好所有依赖

两条路径共享同一套下载逻辑和目录约定，最终状态一致。

## Requirements

**安装包**

- R1. 安装包（.dmg / .app）**不包含** ASR/TTS 模型文件和二进制服务文件
- R2. 安装包大小控制在 Electron 应用本身范围（~150MB），不包含额外资源

**App 首次启动引导（主线路径）**

- R3. 启动时按顺序检测：SoX → espeak-ng → 二进制服务 → ASR/TTS 模型 → Ollama 运行状态
- R4. SoX 或 espeak-ng 未安装时，弹出模态对话框提示用户，显示 `brew install sox espeak-ng` 命令并提供"复制到剪贴板"按钮；用户点击"已完成安装"后重新检测
- R5. 二进制服务（asr-server、kitten-tts-server）未找到时，**自动**从 GitHub Releases 下载到 `~/.config/hi-kid/bin/`
- R6. ASR/TTS 模型未找到时，**自动**从 GitHub Releases 下载到 `~/.config/hi-kid/models/`，支持断点续传
- R7. Ollama 未运行或未安装时，仅弹出提示说明其为前提条件，**不**自动安装或下载
- R8. 自动下载过程中显示进度（文件级进度和总体进度），允许取消
- R9. 所有检测通过后自动进入主界面，无需重启 App

**独立安装脚本（辅助路径）**

- R10. 提供 `scripts/install-dependencies.sh`（macOS ARM64 专用）
- R11. 脚本自动执行：`brew install sox espeak-ng`、下载二进制到 `~/.config/hi-kid/bin/`、下载模型到 `~/.config/hi-kid/models/`
- R12. 脚本使用与 App 相同的 GitHub Releases 下载源和目录约定
- R13. 脚本**不包含** Ollama 和 LLM 模型的安装
- R14. 脚本运行完成后提示用户"已就绪，请打开 HiKid.app"

**下载源**

- R15. 默认下载源为 GitHub Releases，下载 URL 硬编码在应用和脚本中
- R16. 支持通过环境变量覆盖下载源（保留现有 `TTS_MODEL_DOWNLOAD_URL` 等变量）

## Success Criteria

- 新用户下载 .dmg 安装后，首次打开 App 能在 5 分钟内完成所有引导和下载并进入主界面（网络正常情况下）
- 提前运行过 `install-dependencies.sh` 的用户，首次打开 App 直接跳过所有引导和下载
- 安装包大小不超过 200MB

## Scope Boundaries

- **不包含** Windows/Linux 安装支持（当前项目仅支持 macOS ARM64）
- **不包含** Ollama 和 LLM 模型（`qwen3:0.6b`）的自动安装
- **不包含** 代码签名或公证流程的改进
- **不包含** 二进制/模型的自动更新机制（仅首次下载）

## Key Decisions

- **GitHub Releases 作为默认下载源**：零成本，与现有发布流程一致
- **独立脚本不签名**：目标用户为家长中的技术用户，终端执行可接受；降低维护成本
- **Ollama 作为前提条件保留**：Ollama 是通用 LLM 工具，用户可能有独立管理需求；且 LLM 模型拉取流程与 ASR/TTS 差异较大

## Dependencies / Assumptions

- 假设目标用户运行的 macOS 已安装 Homebrew（或愿意安装）
- 假设 GitHub Releases 在国内外的可访问性足够（如遇问题可后续加 CDN fallback）
- 项目已有断点续传下载基础设施（`src/main/services/download.ts`）

## Outstanding Questions

### Deferred to Planning

- [Affects R5-R6][Technical] GitHub Releases 的具体 tag 命名和 asset 文件名约定
- [Affects R5-R6][Technical] 下载失败时的重试策略和错误提示文案
- [Affects R4][Needs research] 是否存在无需 SoX/espeak-ng 的替代方案（如纯 Node.js 音频处理），可降低系统依赖门槛

## Next Steps

-> `/ce:plan` for structured implementation planning
