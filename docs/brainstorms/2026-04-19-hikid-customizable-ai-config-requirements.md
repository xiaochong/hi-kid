---
date: 2026-04-19
topic: customizable-ai-config
---

# 可自定义 AI 配置

## Problem Frame

当前 AI 的名称（"Kitten"）、系统提示词和 LLM 连接参数（base URL、API key、model）全部硬编码在源代码中，用户无法在不修改代码和重新打包的情况下自定义。这会限制：

- 用户无法调整 AI 的角色设定（比如换成一个机器人朋友）
- 用户无法切换到其他 LLM provider
- 产品发布后无法灵活适配不同地区用户的需求

目标：提供一个用户友好的设置面板，让用户可以自定义 AI 名称、系统提示词和 LLM 连接参数，配置持久化到本地文件，修改后即时生效。

## Requirements

**配置项**
- R1. AI 名称：默认值为 `"Kitten"`，用户可自定义
- R2. 系统提示词：默认值为英文对话伙伴提示词（`You are a friendly English conversation partner named Kitten...`，详见代码），用户可自定义
- R3. LLM Base URL：默认值为 `http://localhost:11434/v1`，用户可自定义
- R4. LLM API Key：默认值为 `"ollama"`，用户可自定义
- R5. LLM Model Name：默认值为 `"qwen3:0.6b"`，用户可自定义

**配置存储**
- R6. 配置文件统一放在 `~/.config/hi-kid/config.json` 中（遵循现有代码使用的 `os.homedir() + '.config/hi-kid'` 路径模式，Windows 下为 `%APPDATA%\hi-kid\`），格式为 JSON，包含 `version` 字段（当前为 `1`）
- R7. 配置文件以键值对形式存储，方便未来扩展更多配置项
- R8. 启动时读取配置文件，不存在则使用默认值并自动生成；写入时使用原子写入（先写临时文件再 rename）以避免损坏
- R8a. 配置文件创建时设置权限为 0o600（仅所有者可读写），路径解析后需验证在 `~/.config/hi-kid/` 目录内
- R8b. 若配置文件存在但格式错误或损坏，自动回退到默认值并重新生成有效配置文件

**设置面板 UI**
- R9. 在现有顶部设置区域（`SettingsPanel`）中添加配置入口，扩展为支持多 tab/多面板切换
- R10. 配置编辑区提供清晰的表单：AI 名称（短文本输入）、系统提示词（多行文本输入）、Base URL（文本输入）、API Key（文本输入）、Model Name（文本输入）
- R10a. AI 名称最大长度 32 字符，限制字符集（字母、数字、空格、常用标点）；Model Name 最大长度 128 字符，不允许控制字符
- R11. API Key 输入框不使用掩码显示
- R12. 保存按钮点击后即时生效：AI 名称和系统提示词在下次对话轮次生效，LLM 参数变更后自动重建 Agent
- R12a. 重建 Agent 前先取消旧 Agent 的事件订阅（`unsubscribe`），确保旧实例可被垃圾回收
- R13. 保存成功后提供视觉反馈（如 Toast 提示）
- R13a. 表单首次加载时显示预填充的默认值（非 placeholder），加载期间有短暂骨架/占位状态

**即时生效**
- R14. AI 名称和系统提示词修改后在下次对话轮次生效，无需重启应用（当前进行中的对话轮次仍使用旧提示词）
- R15. LLM 参数（base URL / API key / model）修改后，自动中断当前对话、重建 Agent 实例并使用新参数建立到 LLM provider 的 HTTP 连接（对话历史不保留）

**UI 文本同步**
- R16. OnboardingScreen、ChatBubbles 的空状态提示、DownloadScreen 等所有硬编码 `"Kitten"` 的 UI 文本必须从配置中读取 AI 名称并动态渲染

## Success Criteria

- 用户打开设置面板可以修改所有 5 个配置项并保存
- 修改 AI 名称后，UI 中的显示和 Agent 的自我介绍都使用新名称
- 修改系统提示词后，Agent 后续对话遵循新设定
- 修改 LLM 参数后，Agent 能成功连接到新的 provider 或模型
- 配置在应用重启后依然保持
- 若配置文件损坏或格式错误，应用自动回退到默认值并重新生成有效配置文件

## Scope Boundaries

- 不包含配置导入/导出功能
- 不包含配置预设模板功能
- 不包含多 profile 切换功能
- 不包含配置密码保护或加密
- 不包含自动检测 provider 可用性的功能

## Key Decisions

- **设置入口扩展现有 SettingsPanel**：与语音模式切换放在同一区域，通过 icon 或 tab 切换面板。这样保持顶部导航区域简洁，同时用户容易发现。
- **API Key 明文显示**：这是本地 Electron 桌面应用，配置仅保存在用户本地机器；掩码显示会增加交互成本，且孩子用户可能在家庭/教室环境使用（存在屏幕共享/肩窥风险）。加密保护明确排除在范围外。
- **所有配置统一放在一个 JSON 文件**：`~/.config/hi-kid/config.json`（遵循现有 `os.homedir() + '.config/hi-kid'` 路径模式，Windows 下等效），包含 `version` 字段以便未来扩展，预留扩展空间。
- **即时生效**：用户无需手动重启服务，保存后自动处理 Agent 重建。虽然实现复杂度略高，但用户体验好得多。系统提示词变更在下次对话轮次生效（非当前进行中轮次），LLM 参数变更重建 Agent 后对话历史不保留。

## Dependencies / Assumptions

- `~/.config/hi-kid/` 目录已经存在（当前用于存放模型文件）
- `createAgent` 函数需要重构以支持运行时传入 systemPrompt 和 AI 名称，且 Agent 实例支持 unsubscribe
- 主进程具备读写用户 home 目录下配置文件的权限
- 配置优先级：config.json > 环境变量 > 硬编码默认值

## Outstanding Questions

### Resolve Before Planning
（无）

### Deferred to Planning
- **R12 - Needs research**: 重建 Agent 时是否需要优雅中断当前 TTS 播放和 pending 请求？当前的 `agent.abort()` 和 `stopSpeaking()` 是否足够？
- **R9 - Technical**: SettingsPanel 的 tab/面板切换交互模式选择：下拉菜单、tab bar 还是点击齿轮展开面板？

## Next Steps

- \> /ce:plan for structured implementation planning
