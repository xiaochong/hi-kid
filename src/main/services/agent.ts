import { Agent, type AgentEvent, type StreamFn } from '@mariozechner/pi-agent-core'
import type { Model, AssistantMessageEvent } from '@mariozechner/pi-ai'
import { playSentence, stopPlayback } from './playback'
import { getMainWindow } from './window'
import { logger } from './logger'

// --- State ---
let activeTtsCount = 0
let pendingTtsCount = 0
let isConversationComplete = true
let agentInstance: Agent | null = null

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

function createTtsStreamFn(
  baseStreamFn: StreamFn,
  baseUrl: string,
  createAssistantMessageEventStreamFn: () => ReturnType<
    typeof import('@mariozechner/pi-ai').createAssistantMessageEventStream
  >,
  unreachableHint: string
): StreamFn {
  return async (model, context, options) => {
    const stream = await baseStreamFn(model, context, options)
    const out = createAssistantMessageEventStreamFn()

    let buffer = ''
    let ttsQueue: Promise<void> = Promise.resolve()
    let hasStreamError = false

    function maybeSendIdle(): void {
      if (isConversationComplete && pendingTtsCount === 0) {
        sendToRenderer('kitten:state', 'idle')
      }
    }

    function enqueueTts(text: string): void {
      const trimmed = text.trim()
      if (!trimmed) return

      pendingTtsCount++
      // Strictly sequential fetch+play to match tts-test.ts behavior exactly
      ttsQueue = ttsQueue
        .then(async () => {
          activeTtsCount++
          if (activeTtsCount === 1) {
            sendToRenderer('kitten:state', 'speaking')
          }
          sendToRenderer('tts:event', 'start')
          try {
            await playSentence(trimmed, baseUrl)
          } finally {
            activeTtsCount--
            pendingTtsCount--
            if (activeTtsCount === 0) {
              sendToRenderer('tts:event', 'end')
            }
            maybeSendIdle()
          }
        })
        .catch(() => {
          pendingTtsCount--
          maybeSendIdle()
        })
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
          } else if (event.type === 'error') {
            hasStreamError = true
            sendToRenderer('error', { message: unreachableHint })
          } else if (event.type === 'text_end' || event.type === 'done') {
            if (buffer.trim()) {
              enqueueTts(buffer.trim())
              buffer = ''
            }
          }
        }
        const result = await stream.result()
        await ttsQueue
        out.end(result)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error('[TTS Stream] error:', message)
        if (!hasStreamError) {
          sendToRenderer('error', { message: unreachableHint })
        }
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
  unreachableHint?: string
  aiName?: string
  systemPrompt?: string
}

export async function createAgent(config: AgentConfig): Promise<Agent> {
  const localTtsBaseUrl = `http://localhost:${config.ttsPort}`

  // Dynamically import ESM-only pi-ai module
  const piAi = await import('@mariozechner/pi-ai')
  const streamSimple = piAi.streamSimple
  const createAssistantMessageEventStream = piAi.createAssistantMessageEventStream

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
    logger.warn('TTS warm-up failed (first sentence may have a slight delay)')
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

  const aiName = config.aiName?.trim() || 'Kitten'
  const rawSystemPrompt =
    config.systemPrompt?.trim() ||
    `You are a friendly English conversation partner named ${aiName}. Your goal is to help the user practice spoken English.

Rules:
- Always respond in English
- Keep responses concise (1-3 sentences) for natural conversation flow
- Be encouraging and supportive
- If the user makes grammar mistakes, gently correct them
- Ask follow-up questions to keep the conversation going
- Adapt to the user's level - if they're beginner, use simpler vocabulary
- Absolute prohibition of emoji usage / Emojis are strictly forbidden
`
  const systemPrompt = rawSystemPrompt.replace(/\{\{AI_NAME\}\}/g, aiName)

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model,
      thinkingLevel: 'off',
      tools: []
    },
    streamFn: createTtsStreamFn(
      streamSimple as unknown as StreamFn,
      localTtsBaseUrl,
      createAssistantMessageEventStream,
      config.unreachableHint ?? 'Ollama seems to be taking a nap. Make sure it is running!'
    ),
    getApiKey: async () => config.apiKey
  })

  // Subscribe to events and forward to renderer
  agent.subscribe((event: AgentEvent) => {
    switch (event.type) {
      case 'agent_start':
        isConversationComplete = false
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
        isConversationComplete = true
        if (pendingTtsCount === 0) {
          sendToRenderer('kitten:state', 'idle')
        }
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

export function resetConversationState(): void {
  isConversationComplete = true
}

// --- State queries ---
export function getIsSpeaking(): boolean {
  return activeTtsCount > 0
}

export function isAgentBusy(): boolean {
  return !isConversationComplete
}

export function stopSpeaking(): void {
  stopPlayback()
  activeTtsCount = 0
  pendingTtsCount = 0
}
