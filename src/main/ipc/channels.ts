import { ipcMain, BrowserWindow } from 'electron'
import { startServers, stopServers, asrUrl, type ServerConfig } from '../services/servers'
import {
  createAgent,
  getAgent,
  stopSpeaking,
  getIsSpeaking,
  isAgentBusy,
  resetConversationState,
  resetAgent,
  type AgentConfig
} from '../services/agent'
import {
  recordWithVad,
  stopRecordingProcess,
  convertAudio,
  analyzeAudio,
  MIN_VALID_RMS
} from '../services/recorder'
import {
  checkModelsExist,
  downloadModels,
  downloadAndExtractArchives,
  type DownloadConfig
} from '../services/download'
import { getInstallManifest } from '../services/releases'
import { loadConfig, saveConfig, type AppConfig } from '../services/config'
import { checkSystemDeps } from '../services/deps'
import fs from 'fs'
import path from 'path'
import os from 'os'

// --- Config ---
const HI_KID_DIR = path.join(process.env.HOME || os.homedir(), '.config', 'hi-kid')
const MODELS_BASE_DIR = path.join(HI_KID_DIR, 'models')
const BIN_DIR = path.join(HI_KID_DIR, 'bin')

const serverConfig: ServerConfig = {
  ttsPort: parseInt(process.env.TTS_PORT || '8081'),
  asrPort: parseInt(process.env.ASR_PORT || '8082'),
  ttsModelPath:
    process.env.TTS_MODEL_PATH || path.join(MODELS_BASE_DIR, 'kitten', 'kitten-tts-micro'),
  asrModelPath:
    process.env.ASR_MODEL_PATH || path.join(MODELS_BASE_DIR, 'qwen3_asr_rs', 'Qwen3-ASR-0.6B')
}

function getLlmConfig(): Pick<
  AppConfig,
  'baseUrl' | 'apiKey' | 'modelName' | 'aiName' | 'systemPrompt'
> {
  const cfg = loadConfig()
  return {
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    modelName: cfg.modelName,
    aiName: cfg.aiName,
    systemPrompt: cfg.systemPrompt
  }
}

const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10)
const LLM_UNREACHABLE_HINT =
  process.env.LLM_UNREACHABLE_HINT || 'Ollama seems to be taking a nap. Make sure it is running!'

import { type Agent } from '@mariozechner/pi-agent-core'

async function promptWithTimeout(agent: Agent, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('LLM_TIMEOUT'))
    }, LLM_TIMEOUT_MS)

    agent.prompt(text).then(
      () => {
        clearTimeout(timer)
        resolve()
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

const TMP_DIR = path.join(os.tmpdir(), 'hi-kid')
const RECORDING_RAW = path.join(TMP_DIR, 'raw.wav')
const RECORDING_FILE = path.join(TMP_DIR, 'recording.wav')

let servicesReady = false
let downloadInProgress = false
let abortController: AbortController | null = null

function hasLegacyEnvUrls(): boolean {
  return !!(
    process.env.TTS_MODEL_DOWNLOAD_URL ||
    process.env.ASR_MODEL_DOWNLOAD_URL ||
    process.env.TTS_BIN_DOWNLOAD_URL ||
    process.env.ASR_BIN_DOWNLOAD_URL
  )
}

function getDownloadConfig(): DownloadConfig {
  // Model download URLs can be configured via environment variables
  const ttsUrl = process.env.TTS_MODEL_DOWNLOAD_URL || ''
  const asrUrl = process.env.ASR_MODEL_DOWNLOAD_URL || ''
  const ttsBinUrl = process.env.TTS_BIN_DOWNLOAD_URL || ''
  const asrBinUrl = process.env.ASR_BIN_DOWNLOAD_URL || ''

  const ttsLocal = path.resolve(serverConfig.ttsModelPath)
  const asrLocal = path.resolve(serverConfig.asrModelPath)
  const ttsBinLocal = path.join(BIN_DIR, 'kitten-tts-server')
  const asrBinLocal = path.join(BIN_DIR, 'asr-server')

  const models: {
    name: string
    url: string
    localPath: string
    size?: number
    sha256?: string
    executable?: boolean
  }[] = []

  // Binaries: download if URL configured and file missing
  if (ttsBinUrl && !fs.existsSync(ttsBinLocal)) {
    models.push({
      name: 'TTS Server',
      url: ttsBinUrl,
      localPath: ttsBinLocal,
      size: parseInt(process.env.TTS_BIN_SIZE || '0', 10),
      executable: true
    })
  }

  if (asrBinUrl && !fs.existsSync(asrBinLocal)) {
    models.push({
      name: 'ASR Server',
      url: asrBinUrl,
      localPath: asrBinLocal,
      size: parseInt(process.env.ASR_BIN_SIZE || '0', 10),
      executable: true
    })
  }

  // Models: download if URL configured and directory/file missing
  if (ttsUrl && !fs.existsSync(ttsLocal)) {
    models.push({
      name: 'TTS Model',
      url: ttsUrl,
      localPath: ttsLocal,
      size: parseInt(process.env.TTS_MODEL_SIZE || '0', 10)
    })
  }

  if (asrUrl && !fs.existsSync(asrLocal)) {
    models.push({
      name: 'ASR Model',
      url: asrUrl,
      localPath: asrLocal,
      size: parseInt(process.env.ASR_MODEL_SIZE || '0', 10)
    })
  }

  // Always include local paths for existence check, even if no download URL
  return {
    models: [
      ...models,
      { name: 'TTS Bin', url: '', localPath: ttsBinLocal },
      { name: 'ASR Bin', url: '', localPath: asrBinLocal },
      { name: 'TTS Local', url: '', localPath: ttsLocal },
      { name: 'ASR Local', url: '', localPath: asrLocal }
    ],
    userDataPath: HI_KID_DIR
  }
}

function checkAllAssetsExist(): boolean {
  const manifest = getInstallManifest(BIN_DIR, MODELS_BASE_DIR)
  const allFiles = [...manifest.directDownloads, ...manifest.archives.flatMap((a) => a.entries)]
  return allFiles.every((f) => fs.existsSync(f.localPath))
}

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

const FAIRY_TALE_ERRORS: Record<string, string> = {
  ASR_EMPTY: 'My ears are sleepy, can you say it louder?',
  LLM_TIMEOUT: "My brain got a little dizzy, let's try again!",
  TTS_FAILURE: 'My voice is hiding, can you ask me something else?',
  SERVICE_START: 'My toys are still waking up, please wait a moment!',
  AGENT_NOT_READY: "I'm not ready yet, can you wait a little?",
  ASR_SERVER: 'My ears are a bit confused, can you try again?',
  DOWNLOAD_FAILED: 'Oops, something went wrong while getting my toys!',
  NETWORK: 'The internet seems sleepy, can you try again?',
  GENERIC: 'Oops, something unexpected happened!'
}

function sendFairyTaleError(type: string): void {
  const message = FAIRY_TALE_ERRORS[type] ?? FAIRY_TALE_ERRORS.GENERIC
  console.error('[Error]', message)
  sendToRenderer('error', { message })
}

function resetRecordingState(): void {
  sendToRenderer('transcription', { text: '' })
  sendToRenderer('kitten:state', 'idle')
}

function getRecordingSize(path: string): number {
  try {
    return fs.statSync(path).size
  } catch {
    return 0
  }
}

// --- Invokes ---

async function startServicesInternal(): Promise<void> {
  if (servicesReady) {
    sendToRenderer('service:status', { ready: true })
    return
  }

  try {
    // Check model directories exist before starting servers
    if (!fs.existsSync(serverConfig.ttsModelPath)) {
      throw new Error(
        `TTS model not found at ${serverConfig.ttsModelPath}. Place the model there or set TTS_MODEL_DOWNLOAD_URL to download it.`
      )
    }
    if (!fs.existsSync(serverConfig.asrModelPath)) {
      throw new Error(
        `ASR model not found at ${serverConfig.asrModelPath}. Place the model there or set ASR_MODEL_DOWNLOAD_URL to download it.`
      )
    }

    fs.mkdirSync(TMP_DIR, { recursive: true })
    await startServers(serverConfig)
    servicesReady = true
    sendToRenderer('service:status', { ready: true })

    const llmCfg = getLlmConfig()
    const agentConfig: AgentConfig = {
      baseUrl: llmCfg.baseUrl,
      apiKey: llmCfg.apiKey,
      modelName: llmCfg.modelName,
      aiName: llmCfg.aiName,
      systemPrompt: llmCfg.systemPrompt,
      ttsPort: serverConfig.ttsPort,
      unreachableHint: LLM_UNREACHABLE_HINT
    }
    await createAgent(agentConfig)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Failed to start services:', message)
    sendFairyTaleError('SERVICE_START')
    throw err
  }
}

async function recreateAgent(): Promise<void> {
  stopSpeaking()
  const agent = getAgent()
  if (agent) {
    agent.abort()
    resetAgent()
  }

  const llmCfg = getLlmConfig()
  const agentConfig: AgentConfig = {
    baseUrl: llmCfg.baseUrl,
    apiKey: llmCfg.apiKey,
    modelName: llmCfg.modelName,
    aiName: llmCfg.aiName,
    systemPrompt: llmCfg.systemPrompt,
    ttsPort: serverConfig.ttsPort,
    unreachableHint: LLM_UNREACHABLE_HINT
  }
  await createAgent(agentConfig)
}

export function registerIpcChannels(): void {
  ipcMain.handle('services:start', async () => {
    await startServicesInternal()
  })

  ipcMain.handle('services:stop', () => {
    stopServers()
    stopSpeaking()
    servicesReady = false
    sendToRenderer('service:status', { ready: false })
  })

  ipcMain.handle('agent:sendMessage', async (_event, text: string) => {
    const agent = getAgent()
    if (!agent) {
      sendFairyTaleError('AGENT_NOT_READY')
      return
    }
    if (!text || text.length < 2) {
      sendFairyTaleError('ASR_EMPTY')
      return
    }

    try {
      sendToRenderer('kitten:state', 'thinking')
      if (getIsSpeaking() || isAgentBusy()) {
        stopSpeaking()
        agent.steer({ role: 'user', content: text, timestamp: Date.now() })
      } else {
        await promptWithTimeout(agent, text)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[agent:sendMessage] error:', message)
      // Show the configured unreachable hint for all LLM errors (timeout or connection failure)
      sendToRenderer('error', { message: LLM_UNREACHABLE_HINT })
      sendToRenderer('kitten:state', 'idle')
    }
  })

  ipcMain.handle('agent:interrupt', () => {
    stopSpeaking()
    const agent = getAgent()
    if (agent) {
      agent.abort()
    }
    sendToRenderer('kitten:state', 'interrupted')
    setTimeout(() => {
      sendToRenderer('kitten:state', 'idle')
    }, 500)
  })

  ipcMain.handle('agent:reset', () => {
    stopRecordingProcess()
    stopSpeaking()
    const agent = getAgent()
    if (agent) {
      agent.reset()
    }
    resetConversationState()
    sendToRenderer('kitten:state', 'idle')
  })

  ipcMain.handle('models:check', async () => {
    if (hasLegacyEnvUrls()) {
      const downloadConfig = getDownloadConfig()
      const exists = checkModelsExist(downloadConfig)
      return { exists }
    }
    const exists = checkAllAssetsExist()
    return { exists }
  })

  ipcMain.handle('models:download', async () => {
    if (downloadInProgress) return
    downloadInProgress = true
    abortController = new AbortController()

    try {
      if (hasLegacyEnvUrls()) {
        const downloadConfig = getDownloadConfig()
        await downloadModels(
          downloadConfig,
          (progress) => {
            sendToRenderer('download:progress', progress)
          },
          abortController.signal
        )
      } else {
        const manifest = getInstallManifest(BIN_DIR, MODELS_BASE_DIR)
        const totalSize = [...manifest.directDownloads, ...manifest.archives].reduce(
          (sum, item) => sum + (item.size || 0),
          0
        )
        let completedBytes = 0

        const reportProgress = (bytes: number, _total: number, currentFile: string): void => {
          sendToRenderer('download:progress', {
            bytes: completedBytes + bytes,
            total: totalSize,
            currentFile
          })
        }

        // Download direct files
        const directConfig: DownloadConfig = {
          models: manifest.directDownloads.map((d) => ({
            name: d.name,
            url: d.url,
            localPath: d.localPath,
            size: d.size,
            executable: d.executable
          })),
          userDataPath: HI_KID_DIR
        }
        await downloadModels(
          directConfig,
          (progress) => {
            reportProgress(progress.bytes, progress.total, progress.currentFile)
          },
          abortController.signal
        )
        completedBytes += manifest.directDownloads.reduce((sum, d) => sum + (d.size || 0), 0)

        if (!abortController.signal.aborted) {
          // Download and extract archives
          await downloadAndExtractArchives(
            manifest.archives,
            (bytes, _total, currentFile) => {
              reportProgress(bytes, _total, currentFile)
            },
            abortController.signal
          )
          completedBytes += manifest.archives.reduce((sum, a) => sum + (a.size || 0), 0)
        }
      }

      if (!abortController.signal.aborted) {
        // After download completes, auto-start services
        await startServicesInternal()
      }
    } catch (err) {
      if (abortController?.signal.aborted) {
        console.log('Download cancelled by user')
      } else {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Download failed:', message)
        sendFairyTaleError('DOWNLOAD_FAILED')
      }
    } finally {
      downloadInProgress = false
      abortController = null
    }
  })

  ipcMain.handle('models:download:cancel', () => {
    if (abortController) {
      abortController.abort()
    }
  })

  ipcMain.handle('deps:check', async () => {
    const deps = await checkSystemDeps()
    return deps
  })

  // --- Recorder handlers ---
  let recorderLock: Promise<void> | null = null

  ipcMain.handle('recorder:start', async () => {
    if (recorderLock || !servicesReady) return false

    recorderLock = (async () => {
      sendToRenderer('kitten:state', 'listening')

      try {
        await recordWithVad(RECORDING_RAW)

        // If user stopped early (quick tap), the raw file may be empty or missing
        if (getRecordingSize(RECORDING_RAW) < 100) {
          resetRecordingState()
          return
        }

        convertAudio(RECORDING_RAW, RECORDING_FILE)

        const info = analyzeAudio(RECORDING_FILE)
        if (info.rms < MIN_VALID_RMS || info.duration < 0.3) {
          resetRecordingState()
          return
        }

        // Transcribe
        const formData = new FormData()
        const audioBuffer = fs.readFileSync(RECORDING_FILE)
        formData.append('file', new Blob([audioBuffer]), 'recording.wav')
        formData.append('language', 'english')
        formData.append('response_format', 'json')

        const res = await fetch(`${asrUrl(serverConfig)}/v1/audio/transcriptions`, {
          method: 'POST',
          body: formData
        })

        if (!res.ok) {
          sendFairyTaleError('ASR_SERVER')
          resetRecordingState()
          return
        }

        const data = (await res.json()) as { text?: string }
        const text = (data.text || '').replace(/<\/?asr_text>/g, '').trim()

        if (!text || text.length < 2) {
          sendFairyTaleError('ASR_EMPTY')
          resetRecordingState()
          return
        }

        sendToRenderer('transcription', { text })

        // Send to agent
        const agent = getAgent()
        if (!agent) {
          sendFairyTaleError('AGENT_NOT_READY')
          resetRecordingState()
          return
        }

        if (getIsSpeaking() || isAgentBusy()) {
          stopSpeaking()
          agent.steer({ role: 'user', content: text, timestamp: Date.now() })
        } else {
          await promptWithTimeout(agent, text)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[recorder:start] error:', message)
        sendToRenderer('error', { message: LLM_UNREACHABLE_HINT })
        resetRecordingState()
      }
    })()

    await recorderLock
    recorderLock = null
    return true
  })

  ipcMain.handle('recorder:stop', async () => {
    stopRecordingProcess()
    if (recorderLock) {
      await recorderLock
    } else {
      resetRecordingState()
    }
  })

  // --- Config handlers ---
  ipcMain.handle('config:get', () => {
    const cfg = loadConfig()
    return {
      aiName: cfg.aiName,
      systemPrompt: cfg.systemPrompt,
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      modelName: cfg.modelName
    }
  })

  ipcMain.handle('config:set', async (_event, newConfig: unknown) => {
    if (typeof newConfig !== 'object' || newConfig === null) {
      throw new Error('Invalid config object')
    }
    const n = newConfig as Record<string, unknown>

    // Validate required fields
    if (typeof n.aiName !== 'string' || n.aiName.length > 32) {
      throw new Error('AI name must be a string with max 32 characters')
    }
    if (typeof n.systemPrompt !== 'string') {
      throw new Error('System prompt must be a string')
    }
    if (typeof n.baseUrl !== 'string' || n.baseUrl.length > 512) {
      throw new Error('Base URL must be a string with max 512 characters')
    }
    if (typeof n.apiKey !== 'string' || n.apiKey.length > 512) {
      throw new Error('API key must be a string with max 512 characters')
    }
    if (typeof n.modelName !== 'string' || n.modelName.length > 128) {
      throw new Error('Model name must be a string with max 128 characters')
    }

    const current = loadConfig()
    const updated: AppConfig = {
      version: current.version,
      aiName: n.aiName.trim() || current.aiName,
      systemPrompt: n.systemPrompt || current.systemPrompt,
      baseUrl: n.baseUrl.trim() || current.baseUrl,
      apiKey: n.apiKey,
      modelName: n.modelName.trim() || current.modelName
    }

    const llmChanged =
      updated.baseUrl !== current.baseUrl ||
      updated.apiKey !== current.apiKey ||
      updated.modelName !== current.modelName

    saveConfig(updated)

    if (llmChanged && servicesReady) {
      try {
        await recreateAgent()
        resetConversationState()
        sendToRenderer('config:changed', updated)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[config:set] Failed to recreate agent:', message)
        sendToRenderer('error', { message: LLM_UNREACHABLE_HINT })
        throw new Error('Failed to reconnect to AI with new settings')
      }
    } else {
      sendToRenderer('config:changed', updated)
    }
  })
}
