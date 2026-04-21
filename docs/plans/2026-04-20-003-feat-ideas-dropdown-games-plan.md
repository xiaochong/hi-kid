---
title: 'feat: Ideas 二级菜单与口语游戏'
type: feat
status: active
date: 2026-04-20
origin: docs/brainstorms/2026-04-20-ideas-dropdown-games-requirements.md
---

# Ideas 二级菜单与口语游戏

## Overview

Expand the Ideas dropdown from a single "Try Saying" chip list to a multi-category secondary menu, adding a "Speaking Games" category with 11 English interactive games. Each game shows a confirmation card before starting, then sends game rules as a system message to the chat area, with AI hosting the game session.

## Problem Frame

The current Ideas dropdown has only one "Try Saying" category with a flat chip list of 5 topics, unable to hold more items or new categories. As the product expands into interactivity, oral game formats need to be introduced while avoiding accidental game entry and ensuring AI accurately understands game rules. (see origin)

## Requirements Trace

- **R1-R4**（二级菜单结构）→ Unit 3
- **R5-R6**（游戏确认卡片）→ Unit 3
- **R7**（系统消息发送规则）→ Unit 1 + Unit 5
- **R8-R9**（AI 主持游戏）→ Unit 2（规则文案）+ Unit 5（集成）
- **R10-R20**（11 款游戏定义）→ Unit 2

## Scope Boundaries

- Unified difficulty, no age grading
- Pure turn-based, no client-side timers
- No game history, scores, or leaderboards
- No voice-interaction-specific game logic; reuse existing text messaging
- No "play again" shortcut
- Static game list, no loading state

### Deferred to Separate Tasks

- AI game rule prompt tuning: if a game performs unstably, iterate its rule copy separately
- Mid-game exit strategy: when user sends non-game messages, AI autonomously decides whether to continue the game or switch to normal chat; not explicitly handled in this plan

## Context & Research

### Relevant Code and Patterns

- **`src/renderer/src/App.tsx`** — Ideas 下拉菜单外壳（按钮 + 面板容器），`topicDropdownOpen` 状态管理，`handleTopicClick` 回调调用 `window.api.sendMessage`
- **`src/renderer/src/components/TopicSuggestions.tsx`** — 当前面板内容组件，硬编码 `TOPICS` 字符串数组，chip 按钮布局
- **`src/renderer/src/components/TopicSuggestions.module.css`** — chip 样式：mint 边框、半透明背景、hover 动效
- **`src/renderer/src/components/ChatBubbles.tsx`** — 消息渲染组件，目前仅支持 `user` 和 `assistant` 两种角色
- **`src/renderer/src/hooks/useConversation.ts`** — 消息状态管理，`messages: ChatMessage[]`，通过 IPC 事件更新
- **`src/renderer/src/types/conversation.ts`** — `ChatMessage` 类型定义：`{ role: 'user' | 'assistant'; text: string; pending?: boolean }`
- **`src/preload/index.ts`** — `window.api.sendMessage(text)` 暴露为 `ipcRenderer.invoke('agent:sendMessage', text)`
- **`src/main/ipc/channels.ts`** — `agent:sendMessage` 处理：调用 `agent.prompt(text)` 或 `agent.steer()`，**不会**自动将消息添加到渲染端消息列表
- **`src/renderer/src/assets/main.css`** — 下拉面板样式（`.topic-dropdown-panel`）：absolute 定位、白色半透明背景、mint 边框、blur 背景、fade-in 动画
- **`src/renderer/src/components/SettingsPanel.tsx`** — 现有 overlay 参考：click-outside + Escape 关闭、useRef + useEffect 模式

### Key Observation: Message Flow

Currently, clicking Try Saying only calls `window.api.sendMessage(topic)`, and **the topic text does not appear in chat history**. This plan changes that behavior: game rules must be explicitly rendered in the chat area as system messages, while the rule text is also sent to AI. This requires actively inserting system messages into the `messages` array on the renderer side, separate from the `sendMessage` call.

## Key Technical Decisions

- **Tab 切换式二级菜单**：顶部两个 Tab（Try Saying | 口语游戏），点击切换下方内容。理由：仅两个大类，Tab 最紧凑直观；避免手风琴式同时展开导致的超长面板；触屏友好。
- **扩展 `ChatMessage` 添加 `system` 角色**：在渲染端本地消息模型中增加 `system`，由 `useConversation` 提供 `addSystemMessage` 方法。不需要新增 IPC 通道，因为主进程的 `sendMessage` 仅负责将文本发送给 AI Agent，不负责维护消息列表。
- **确认卡片内嵌在 IdeasMenu 组件中**：作为组件内部状态管理的 overlay，而非独立 modal。理由：减少全局状态复杂度，click-outside 关闭逻辑可与下拉面板复用。
- **游戏配置集中管理**：所有游戏的元数据和规则文案放在独立数据文件 `src/renderer/src/data/games.ts` 中，便于迭代和维护。
- **游戏启动错误处理**：`handleGameStart` 中先添加系统消息，再调用 `sendMessage`。若 `sendMessage` 失败，在聊天区追加一条错误提示系统消息（如 "Oops, the game couldn't start. Let's try again!"），告知用户游戏启动失败。
- **IdeasMenu 状态在面板关闭时重置**：下拉面板关闭后重新打开时，`IdeasMenu` 恢复默认状态（`activeTab: 'topics'`，`confirmingGame: null`）。实现方式：由 `topicDropdownOpen` prop 驱动，当 prop 从 `false` 变为 `true` 时重置内部状态。

## Open Questions

### Resolved During Planning

- **Secondary menu UI layout**: Tab switching style (top tabs + content area below). Panel min-width expanded from 220px to 320px to accommodate game list and confirmation card.
- **System message implementation**: Extend `ChatMessage.role` to `'user' | 'assistant' | 'system'`, with `useConversation` providing `addSystemMessage(text)` as a pure client-side method, separate from `window.api.sendMessage`.
- **Confirmation card placement**: Embedded inside the IdeasMenu component; clicking a game switches the content area to confirmation card view, with a back button to return to the game list.

### Deferred to Implementation

- **Game rule copy precise wording**: 11 game rule prompts need to be written during Unit 2 and tested for AI response quality. Copy must include tone instructions, but exact wording may be adjusted after first AI test.
- **Panel width final value**: 320px is a planning estimate; actual implementation may need fine-tuning based on content.

## High-Level Technical Design

> _This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce._

### 组件关系

```
App.tsx
├── IdeasMenu (替代 TopicSuggestions)
│   ├── Tab bar: [Try Saying] [口语游戏]
│   ├── Content: TrySayingPanel (chip 列表)
│   ├── Content: GamesPanel (游戏条目列表)
│   └── GameConfirmCard (确认卡片 overlay)
│       ├── Game name, description, rules
│       ├── [Start] [Back]
│       └── Click outside / Escape to close
└── ChatBubbles (add system role rendering)
```

### Game Start Data Flow

```
User clicks game item
  → IdeasMenu enters confirmation state (shows GameConfirmCard)
  → User clicks "Start"
    → IdeasMenu calls onGameStart(game)
    → App.tsx:
      1. addSystemMessage(game.rules) → add system message to local messages array
      2. window.api.sendMessage(game.rules) → send to AI Agent
      3. setTopicDropdownOpen(false) → close dropdown
    → AI receives rules and replies → game begins
```

## Implementation Units

- [ ] **Unit 1: Extend Message Type & Hook**

**Goal:** Provide renderer-side data model support for system messages.

**Requirements:** R7

**Dependencies:** None

**Files:**

- Modify: `src/renderer/src/types/conversation.ts`
- Modify: `src/renderer/src/hooks/useConversation.ts`
- Modify: `src/preload/index.d.ts`

**Approach:**

- Extend `ChatMessage.role` from `'user' | 'assistant'` to `'user' | 'assistant' | 'system'`
- Add `addSystemMessage: (text: string) => void` to `UseConversationReturn` interface
- Implement `addSystemMessage` in `useConversation` hook, directly `setMessages(prev => [...prev, { role: 'system', text }])`
- Update `Window.api` type declaration in `src/preload/index.d.ts` if needed

**Patterns to follow:**

- Existing `messages` state update pattern (functional `setMessages` updates)

**Test scenarios:**

- Happy path: 调用 `addSystemMessage('test')` 后，`messages` 数组末尾出现 `role: 'system'` 的消息
- Edge case: 在空消息列表中调用 `addSystemMessage`，列表长度变为 1
- Edge case: 在已有 user/assistant 消息列表中调用，system 消息追加到末尾

**Verification:**

- `useConversation` 返回的 `addSystemMessage` 方法可以正常调用
- 调用后 `messages` 数组包含正确的 `system` 角色消息

- [ ] **Unit 2: Game Configuration Data**

**Goal:** Define structured configuration and rule prompt copy for 11 games.

**Requirements:** R5, R10-R20

**Dependencies:** None

**Files:**

- Create: `src/renderer/src/data/games.ts`

**Approach:**

- 定义 `GameConfig` 接口：`{ id: string; name: string; description: string; rules: string }`
- `name`: Game display name
- `description`: One-sentence description
- `rules`: Complete English rule prompt copy, sent to AI as system message. Copy structure:
  1. Game name and description
  2. Detailed rules (turn order, win/lose conditions, constraints)
  3. Tone instruction: `"Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging."`
  4. Opening instruction: explicitly tell AI what to say first (e.g. `"You go first. Start by saying an animal name."`)
- 导出 `GAMES: GameConfig[]` 数组包含全部 11 个游戏
- 导出 `TRY_SAYING_TOPICS: { label: string; text: string }[]` 替换当前硬编码的 `TOPICS`

**Patterns to follow:**

- 纯数据文件，无组件逻辑

**Test scenarios:**

- Happy path: `GAMES` 数组长度为 11，每个游戏都有非空的 `id`、`name`、`description`、`rules`
- Happy path: `TRY_SAYING_TOPICS` 包含 5 个话题，与当前 `TopicSuggestions.tsx` 中的 `TOPICS` 一致
- Edge case: 检查所有 `rules` 文案都包含语气指令和开场指令

**Verification:**

- `GAMES` 和 `TRY_SAYING_TOPICS` 数据完整
- 每款游戏的 `rules` 文案可被直接复制到聊天区作为系统消息

- [ ] **Unit 3: Secondary Menu & Confirmation Card Component**

**Goal:** Build a category-switchable Ideas secondary menu with game confirmation cards.

**Requirements:** R1-R6

**Dependencies:** Unit 2

**Files:**

- Create: `src/renderer/src/components/IdeasMenu.tsx`
- Create: `src/renderer/src/components/IdeasMenu.module.css`
- Delete: `src/renderer/src/components/TopicSuggestions.tsx`
- Delete: `src/renderer/src/components/TopicSuggestions.module.css`

**Approach:**

- `IdeasMenu` 组件接收 `onTopicClick: (text: string) => void` 和 `onGameStart: (game: GameConfig) => void` 两个回调
- 内部状态：
  - `activeTab: 'topics' | 'games'` — currently selected category
  - `confirmingGame: GameConfig | null` — game currently showing confirmation card
- **Tab bar**: Two buttons at top with different colors for active state. Try Saying uses mint tones, Speaking Games uses yellow/blue tones (consistent with existing CSS variables).
- **Try Saying content area**: Chip button list, visually consistent with current `TopicSuggestions`
- **Speaking Games content area**: Vertical list, each item shows game name and description, clicking enters confirmation state
- **Confirmation card**: When `confirmingGame` is non-null, content area switches to card view:
  - Game name (large)
  - Description
  - Rules (small text, scrollable, `max-height: 120px; overflow-y: auto`)
  - "Start" button (primary color)
  - "Back" button (secondary style)
  - Card top has a back arrow icon, clicking returns to the game list
- **Loading state**: After user clicks "Start", button enters loading state (disabled + short text like "Starting...") until dropdown closes. No need to wait for AI response since timing is uncertain.
- **State reset**: `IdeasMenu` receives `isOpen` prop; when `isOpen` changes from `false` to `true`, reset `activeTab` to `'topics'` and `confirmingGame` to `null`
- **Touch targets**: All interactive elements minimum 44x44px (Tab buttons, game items, chips, Start/Back buttons)
- Styles use CSS Module, following existing design system (border-radius 16px, transition 0.2s, custom cursor, etc.)
- Panel min-width expanded from 220px to 320px (sync update `.topic-dropdown-panel` in `main.css`)

**Patterns to follow:**

- Chip styles and animations from `TopicSuggestions.module.css`
- Click-outside + Escape close pattern from `SettingsPanel.tsx`
- Existing CSS custom properties (`--ei-c-mint`, `--ei-c-yellow`, `--ei-c-blue`, etc.)

**Test scenarios:**

- Happy path: Default shows Try Saying content, chips are clickable
- Happy path: Click "Speaking Games" tab, shows 11 game items
- Happy path: Click a game item, shows confirmation card with correct content
- Happy path: Click confirmation card "Start", calls `onGameStart`
- Happy path: Click confirmation card "Back" or back arrow, returns to game list
- Edge case: Clicking outside while in confirmation card (App.tsx click-outside closes entire dropdown)
- Edge case: After dropdown closes and reopens, resets to default tab (Try Saying) and confirmation state
- Edge case: After clicking "Start" button enters loading state, prevents duplicate clicks
- Edge case: Touch target size check (Tab, game items, buttons minimum 44x44px)

**Verification:**

- IdeasMenu renders both tabs and content correctly
- Confirmation card displays correct game info
- Clicking "Start" triggers `onGameStart` callback
- Visual style consistent with existing UI

- [ ] **Unit 4: System Message Rendering**

**Goal:** Make ChatBubbles correctly render `system` role messages.

**Requirements:** R7

**Dependencies:** Unit 1

**Files:**

- Modify: `src/renderer/src/components/ChatBubbles.tsx`
- Modify: `src/renderer/src/assets/main.css`

**Approach:**

- 在 `ChatBubbles` 的 `messages.map` 中增加 `system` 分支
- System 消息不显示头像图标，使用居中对齐、小字号、灰色文字、浅色背景
- 添加 CSS 类 `.chat-bubble-system`：
  - `background: var(--ei-c-cream)` 或更浅的灰色
  - `color: var(--ei-c-brown-mute)`
  - `font-size: 12px`
  - `text-align: center`
  - `border-radius: 12px`
  - `padding: 8px 16px`
  - `max-width: 90%`
  - 无头像占位
- 确保 system 消息不参与左右交替布局（不像 user/assistant 那样左右对齐）

**Patterns to follow:**

- 现有 `.chat-bubble-user` 和 `.chat-bubble-assistant` 的样式结构

**Test scenarios:**

- Happy path: messages 中包含 system 消息时，渲染为灰色居中卡片
- Happy path: system 消息与 user/assistant 消息混合时，布局正确
- Edge case: 空消息列表不渲染 system 消息
- Edge case: system 消息文本较长时，换行和滚动正常

**Verification:**

- 包含 `role: 'system'` 的消息在聊天区显示为灰色、无头像、居中的样式
- 视觉风格与现有聊天气泡协调

- [ ] **Unit 5: App.tsx Integration**

**Goal:** Integrate new components and data flow into the main app.

**Requirements:** R1-R9

**Dependencies:** Unit 1, Unit 2, Unit 3, Unit 4

**Files:**

- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/assets/main.css`

**Approach:**

- 删除 `TopicSuggestions` 的 import，替换为 `IdeasMenu` import
- 从 `src/renderer/src/data/games.ts` import `TRY_SAYING_TOPICS` 和 `GAMES`
- 解构 `useConversation` 返回值，添加 `addSystemMessage`
- Keep existing `handleTopicClick`, behavior unchanged (calls `window.api.sendMessage`)
- Add new `handleGameStart(game)`：
  1. 调用 `addSystemMessage(game.rules)` 在聊天区显示游戏规则
  2. 调用 `window.api.sendMessage(game.rules)` 将规则发送给 AI Agent
  3. 关闭下拉面板
  4. **错误处理**：将 `sendMessage` 调用包装在 `try/catch` 中。若失败，调用 `addSystemMessage("Oops, the game couldn't start. Let's try again!")` 告知用户，并 `console.error` 记录错误
- 在 `topic-dropdown-panel` 中替换 `<TopicSuggestions ... />` 为 `<IdeasMenu ... />`
- 更新 `.topic-dropdown-panel` 的 `min-width` 从 `220px` 到 `320px`
- 确认 `dropdownRef` 的 click-outside 逻辑仍然正确（点击 IdeasMenu 内部不应关闭面板）

**Patterns to follow:**

- 现有 `handleTopicClick` 和 `handleClick` 的事件处理模式
- 现有 `dropdownRef` + `pointerdown` click-outside 模式

**Test scenarios:**

- Happy path: Click Try Saying chip, message sent to AI (same as current behavior)
- Happy path: Click Speaking Games → confirmation card → Start, gray system message appears in chat, AI starts game
- Happy path: Click confirmation card Back, returns to game list, dropdown stays open
- Integration: 游戏启动后，system 消息出现在聊天历史中，AI 收到规则后回复
- Edge case: 快速连续点击两个游戏，只处理最后一次的确认
- Edge case: 在 AI 思考/说话时启动游戏，应正常工作（`sendMessage` 会中断当前说话）
- Error path: `sendMessage` 失败时，聊天区显示错误提示系统消息，用户得知游戏启动失败
- Edge case: 下拉面板关闭后重新打开，IdeasMenu 状态已重置

**Verification:**

- Try Saying behavior unchanged from before
- Speaking Games complete flow works: click → confirm → start → system message → AI reply
- Dropdown close logic correct

## System-Wide Impact

- **Interaction graph:** `App.tsx` 新增 `addSystemMessage` 调用点；`IdeasMenu` 新增两个回调接口（`onTopicClick`、`onGameStart`）；`ChatBubbles` 新增 `system` 角色渲染分支
- **Error propagation:** `sendMessage` 的错误处理保持不变（catch + console.error）；`addSystemMessage` 是纯客户端操作，无失败模式
- **State lifecycle risks:** `messages` 数组中 system 消息与普通消息共存，不影响现有的 `clearMessages` 逻辑；`pending` 字段对 system 消息不适用，不需要设置
- **API surface parity:** `window.api.sendMessage` 行为不变；不需要新增 IPC 通道
- **Integration coverage:** 需要验证游戏启动时 `addSystemMessage` 和 `sendMessage` 的调用顺序不会影响 AI 响应；system 消息只渲染不发送给 AI，sendMessage 只发送给 AI 不渲染为 user 消息，两者互补
- **Unchanged invariants:**
  - `window.api.sendMessage` 仍然只负责将文本发送给 AI Agent
  - 录音流程（`startRecording` / `stopRecording`）和消息状态机不受本计划影响
  - `ChatMessage` 的 `pending` 字段语义不变（仅用于 assistant 的打字占位）
  - Kitten 状态机（idle/listening/thinking/speaking）不受本计划影响

## Risks & Dependencies

| Risk                                            | Mitigation                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| AI 无法理解某款游戏的规则，导致游戏无法正常运行 | 规则文案在 Unit 2 中精心编写，包含明确的开场指令；若某款游戏持续不稳定，可单独迭代其规则文案（Deferred to Separate Tasks） |
| 下拉面板宽度扩展后与 `app-header-left` 空间冲突 | 面板 `left: 0` 定位，扩展宽度后若超出屏幕左边缘可调整为 `left: auto; right: 0`，实现时检查                                 |
| 11 款游戏的规则文案工作量较大                   | 规则文案集中在单一数据文件中，可并行编写；实现时先完成 2-3 款验证模式，再复制扩展到其余游戏                                |
| 系统消息样式与现有聊天气泡风格不协调            | 使用现有 CSS 变量（cream、brown-mute），保持圆角和 padding 比例一致                                                        |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-20-ideas-dropdown-games-requirements.md](../brainstorms/2026-04-20-ideas-dropdown-games-requirements.md)
- **Existing dropdown implementation:** `src/renderer/src/App.tsx` (lines 66, 88-98, 190-224)
- **Existing topic component:** `src/renderer/src/components/TopicSuggestions.tsx`
- **Message rendering:** `src/renderer/src/components/ChatBubbles.tsx`
- **Message state management:** `src/renderer/src/hooks/useConversation.ts`
- **IPC message handling:** `src/main/ipc/channels.ts` (lines 281-307)
- **Preload API:** `src/preload/index.ts`
