import fs from 'fs'
import path from 'path'
import os from 'os'

const CONFIG_DIR = path.join(process.env.HOME || os.homedir(), '.config', 'hi-kid')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

const DEFAULT_SYSTEM_PROMPT = `You are a friendly English conversation partner named {{AI_NAME}}. Your goal is to help the user practice spoken English.

Rules:
- Always respond in English
- Keep responses concise (1-3 sentences) for natural conversation flow
- Be encouraging and supportive
- If the user makes grammar mistakes, gently correct them
- Ask follow-up questions to keep the conversation going
- Adapt to the user's level - if they're beginner, use simpler vocabulary
- Absolute prohibition of emoji usage / Emojis are strictly forbidden
`

export interface AppConfig {
  version: number
  aiName: string
  systemPrompt: string
  baseUrl: string
  apiKey: string
  modelName: string
}

function getDefaultConfig(): AppConfig {
  return {
    version: 1,
    aiName: 'Kitten',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    modelName: 'qwen3:0.6b'
  }
}

function validateConfig(config: unknown): config is AppConfig {
  if (typeof config !== 'object' || config === null) return false
  const c = config as Record<string, unknown>
  if (typeof c.aiName !== 'string' || c.aiName.length > 32) return false
  if (typeof c.systemPrompt !== 'string') return false
  if (typeof c.baseUrl !== 'string' || c.baseUrl.length > 512) return false
  if (typeof c.apiKey !== 'string' || c.apiKey.length > 512) return false
  if (typeof c.modelName !== 'string' || c.modelName.length > 128) return false
  return true
}

function mergeWithDefaults(partial: unknown): AppConfig {
  const defaults = getDefaultConfig()
  if (typeof partial !== 'object' || partial === null) return defaults
  const p = partial as Record<string, unknown>
  return {
    version: typeof p.version === 'number' ? p.version : defaults.version,
    aiName: typeof p.aiName === 'string' && p.aiName.trim() ? p.aiName.trim() : defaults.aiName,
    systemPrompt:
      typeof p.systemPrompt === 'string' && p.systemPrompt.trim()
        ? p.systemPrompt
        : defaults.systemPrompt,
    baseUrl:
      typeof p.baseUrl === 'string' && p.baseUrl.trim() ? p.baseUrl.trim() : defaults.baseUrl,
    apiKey: typeof p.apiKey === 'string' ? p.apiKey : defaults.apiKey,
    modelName:
      typeof p.modelName === 'string' && p.modelName.trim()
        ? p.modelName.trim()
        : defaults.modelName
  }
}

export function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const parsed = JSON.parse(data) as unknown
      const merged = mergeWithDefaults(parsed)
      if (!validateConfig(merged)) {
        console.warn('[Config] Invalid config structure, using defaults')
        return getDefaultConfig()
      }
      return merged
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[Config] Failed to load config, using defaults:', message)
  }
  return getDefaultConfig()
}

export function saveConfig(config: AppConfig): void {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
    const tempFile = `${CONFIG_FILE}.tmp`
    const data = JSON.stringify(config, null, 2)
    fs.writeFileSync(tempFile, data, { mode: 0o600 })
    fs.renameSync(tempFile, CONFIG_FILE)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Config] Failed to save config:', message)
    throw err
  }
}

export function getConfig(): AppConfig {
  return loadConfig()
}
