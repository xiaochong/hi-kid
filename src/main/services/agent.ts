import { Agent, type AgentEvent, type StreamFn } from '@mariozechner/pi-agent-core'
import {
  streamSimple,
  type Model,
  createAssistantMessageEventStream,
  type AssistantMessageEvent
} from '@mariozechner/pi-ai'
import { BrowserWindow } from 'electron'
import { playSentence, stopPlayback } from './playback'

// --- State ---
let activeTtsCount = 0
let agentInstance: Agent | null = null

function getMainWindow(): BrowserWindow | null {
  const wins = BrowserWindow.getAllWindows()
  return wins[0] ?? null
}

function sendToRenderer(channel: string, ...args: unknown[]): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args)
  }
}

function extractSentences(text: string): { sentences: string[]; remainder: string } {
  const sentences: string[] = []
  let start = 0

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (/[.!?。！？]/.test(ch)) {
      const next = text[i + 1]
      if (next === undefined || /\s/.test(next) || /[.!?。！？]/.test(next)) {
        const sentence = text.slice(start, i + 1).trim()
        if (sentence) sentences.push(sentence)
        start = i + 1
        while (start < text.length && /\s/.test(text[start])) start++
        i = start - 1
      }
    }
  }

  return { sentences, remainder: text.slice(start) }
}

function createTtsStreamFn(baseStreamFn: StreamFn, baseUrl: string): StreamFn {
  return async (model, context, options) => {
    const stream = await baseStreamFn(model, context, options)
    const out = createAssistantMessageEventStream()

    let buffer = ''
    let ttsQueue: Promise<void> = Promise.resolve()

    function enqueueTts(text: string): void {
      const trimmed = text.trim()
      if (!trimmed) return

      // Strictly sequential fetch+play to match tts-test.ts behavior exactly
      ttsQueue = ttsQueue
        .then(async () => {
          activeTtsCount++
          sendToRenderer('tts:event', 'start')
          try {
            await playSentence(trimmed, baseUrl)
          } finally {
            activeTtsCount--
            if (activeTtsCount === 0) {
              sendToRenderer('tts:event', 'end')
            }
          }
        })
        .catch(() => {})
    }

    ;(async () => {
      try {
        for await (const event of stream) {
          out.push(event)

          if (event.type === 'text_delta') {
            buffer += event.delta
            const { sentences, remainder } = extractSentences(buffer)
            for (const sentence of sentences) {
              enqueueTts(sentence)
            }
            buffer = remainder
          } else if (event.type === 'text_end' || event.type === 'done' || event.type === 'error') {
            if (buffer.trim()) {
              enqueueTts(buffer.trim())
              buffer = ''
            }
          }
        }
        const result = await stream.result()
        await ttsQueue
        out.end(result)
      } catch {
        out.end()
      }
    })().catch(() => {})

    return out
  }
}

// --- Create Agent ---
export interface AgentConfig {
  baseUrl: string
  apiKey: string
  modelName: string
  ttsPort: number
}

export async function createAgent(config: AgentConfig): Promise<Agent> {
  const localTtsBaseUrl = `http://localhost:${config.ttsPort}`

  // Warm up TTS engine so first real sentence doesn't hit cold-start truncation
  try {
    await fetch(`${localTtsBaseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: 'hello!',
        voice: 'Kiki',
        response_format: 'pcm',
        stream: true,
        speed: 1.0
      })
    })
  } catch {
    // ignore warm-up errors
  }

  const model: Model<'openai-completions'> = {
    id: config.modelName,
    name: config.modelName,
    api: 'openai-completions',
    provider: 'custom',
    baseUrl: config.baseUrl,
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 4096,
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: false,
      supportsStore: false
    }
  }

  const agent = new Agent({
    initialState: {
      systemPrompt: `You are a friendly English conversation partner named Kitten. Your goal is to help the user practice spoken English.

Rules:
- Always respond in English
- Keep responses concise (1-3 sentences) for natural conversation flow
- Be encouraging and supportive
- If the user makes grammar mistakes, gently correct them
- Ask follow-up questions to keep the conversation going
- Adapt to the user's level - if they're beginner, use simpler vocabulary
- 只能用小学三年级能懂的词汇
- 尽可能简单和口语化
- 尽量谈些有趣好玩的事情和用户沟通
- 尽可能引起用户兴趣
- 风趣幽默
`,
      model,
      thinkingLevel: 'off',
      tools: []
    },
    streamFn: createTtsStreamFn(streamSimple as unknown as StreamFn, localTtsBaseUrl),
    getApiKey: async () => config.apiKey
  })

  // Subscribe to events and forward to renderer
  agent.subscribe((event: AgentEvent) => {
    switch (event.type) {
      case 'agent_start':
        sendToRenderer('kitten:state', 'thinking')
        break
      case 'message_update': {
        const msgEvent = event.assistantMessageEvent as AssistantMessageEvent
        if (msgEvent.type === 'text_delta') {
          sendToRenderer('llm:delta', { text: msgEvent.delta })
        }
        break
      }
      case 'agent_end': {
        sendToRenderer('kitten:state', 'idle')
        break
      }
    }
  })

  agentInstance = agent
  return agent
}

export function getAgent(): Agent | null {
  return agentInstance
}

export function resetAgent(): void {
  agentInstance = null
}

// --- State queries ---
export function getIsSpeaking(): boolean {
  return activeTtsCount > 0
}

export function stopSpeaking(): void {
  stopPlayback()
  activeTtsCount = 0
}
