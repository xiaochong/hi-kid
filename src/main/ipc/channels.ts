import { ipcMain, BrowserWindow } from 'electron'
import { startServers, stopServers, asrUrl, type ServerConfig } from '../services/servers'
import {
  createAgent,
  getAgent,
  stopSpeaking,
  getIsSpeaking,
  isAgentBusy,
  resetConversationState,
  type AgentConfig
} from '../services/agent'
import { recordWithVad, stopRecordingProcess, convertAudio, analyzeAudio, MIN_VALID_RMS } from '../services/recorder'
import { checkModelsExist, downloadModels, type DownloadConfig } from '../services/download'
import fs from 'fs'
import path from 'path'
import os from 'os'

// --- Config ---
const ECHO_KID_DIR = path.join(process.env.HOME || os.homedir(), '.config', 'echo-kid')
const MODELS_BASE_DIR = path.join(ECHO_KID_DIR, 'models')
const BIN_DIR = path.join(ECHO_KID_DIR, 'bin')

const config: ServerConfig = {
  ttsPort: parseInt(process.env.TTS_PORT || '8081'),
  asrPort: parseInt(process.env.ASR_PORT || '8082'),
  ttsModelPath:
    process.env.TTS_MODEL_PATH || path.join(MODELS_BASE_DIR, 'kitten', 'kitten-tts-micro'),
  asrModelPath:
    process.env.ASR_MODEL_PATH || path.join(MODELS_BASE_DIR, 'qwen3_asr_rs', 'Qwen3-ASR-0.6B')
}

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'ollama'
const MODEL_NAME = process.env.MODEL_NAME || 'qwen3'
const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10)
const LLM_UNREACHABLE_HINT = process.env.LLM_UNREACHABLE_HINT || 'Ollama seems to be taking a nap. Make sure it is running!'

import { type Agent } from '@mariozechner/pi-agent-core'

async function promptWithTimeout(agent: Agent, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('LLM_TIMEOUT'))
    }, LLM_TIMEOUT_MS)

    agent
      .prompt(text)
      .then(
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

const TMP_DIR = path.join(os.tmpdir(), 'echo-kid')
const RECORDING_RAW = path.join(TMP_DIR, 'raw.wav')
const RECORDING_FILE = path.join(TMP_DIR, 'recording.wav')

let servicesReady = false
let downloadInProgress = false

function getDownloadConfig(): DownloadConfig {
  // Model download URLs can be configured via environment variables
  const ttsUrl = process.env.TTS_MODEL_DOWNLOAD_URL || ''
  const asrUrl = process.env.ASR_MODEL_DOWNLOAD_URL || ''
  const ttsBinUrl = process.env.TTS_BIN_DOWNLOAD_URL || ''
  const asrBinUrl = process.env.ASR_BIN_DOWNLOAD_URL || ''

  const ttsLocal = path.resolve(config.ttsModelPath)
  const asrLocal = path.resolve(config.asrModelPath)
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
    userDataPath: ECHO_KID_DIR
  }
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
    if (!fs.existsSync(config.ttsModelPath)) {
      throw new Error(
        `TTS model not found at ${config.ttsModelPath}. Place the model there or set TTS_MODEL_DOWNLOAD_URL to download it.`
      )
    }
    if (!fs.existsSync(config.asrModelPath)) {
      throw new Error(
        `ASR model not found at ${config.asrModelPath}. Place the model there or set ASR_MODEL_DOWNLOAD_URL to download it.`
      )
    }

    fs.mkdirSync(TMP_DIR, { recursive: true })
    await startServers(config)
    servicesReady = true
    sendToRenderer('service:status', { ready: true })

    const agentConfig: AgentConfig = {
      baseUrl: OPENAI_BASE_URL,
      apiKey: OPENAI_API_KEY,
      modelName: MODEL_NAME,
      ttsPort: config.ttsPort,
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
    const downloadConfig = getDownloadConfig()
    const exists = checkModelsExist(downloadConfig)
    return { exists }
  })

  ipcMain.handle('models:download', async () => {
    if (downloadInProgress) return
    downloadInProgress = true

    try {
      const downloadConfig = getDownloadConfig()
      await downloadModels(downloadConfig, (progress) => {
        sendToRenderer('download:progress', progress)
      })

      // After download completes, auto-start services
      await startServicesInternal()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Download failed:', message)
      sendFairyTaleError('DOWNLOAD_FAILED')
    } finally {
      downloadInProgress = false
    }
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

        const res = await fetch(`${asrUrl(config)}/v1/audio/transcriptions`, {
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
        // Show the configured unreachable hint for all LLM errors (timeout or connection failure)
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
}
