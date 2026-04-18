import { spawn, type ChildProcess, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export interface ServerConfig {
  ttsPort: number
  asrPort: number
  ttsModelPath: string
  asrModelPath: string
}

let ttsProcess: ChildProcess | null = null
let asrProcess: ChildProcess | null = null

function findInPath(name: string): string | null {
  try {
    return execSync(`which ${name}`, { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

const BIN_DIR = path.join(process.env.HOME || '', '.config', 'echo-kid', 'bin')

function resolveBin(name: string): string {
  const candidates = [
    path.join(BIN_DIR, name),
    path.join(process.resourcesPath, 'bin', name),
    path.join(__dirname, '../../../../bin', name),
    path.join(__dirname, '../../../bin', name),
    process.env.TTS_BIN_PATH || '',
    process.env.ASR_BIN_PATH || ''
  ]
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c
  }
  // Fall back to PATH
  const fromPath = findInPath(name)
  if (fromPath) return fromPath
  return name
}

export function checkBinaryExists(name: string): boolean {
  const resolved = resolveBin(name)
  return resolved !== name || findInPath(name) !== null
}

function log(prefix: string, data: Buffer | string): void {
  const text = data.toString().trim()
  if (!text) return
  for (const line of text.split('\n')) {
    console.log(`[${prefix}] ${line}`)
  }
}

export async function startServers(config: ServerConfig): Promise<void> {
  // Check binaries exist before spawning
  if (!checkBinaryExists('kitten-tts-server')) {
    throw new Error(
      'kitten-tts-server not found at ~/.config/echo-kid/bin/. Set TTS_BIN_DOWNLOAD_URL to download it, or place it manually.'
    )
  }
  if (!checkBinaryExists('asr-server')) {
    throw new Error(
      'asr-server not found at ~/.config/echo-kid/bin/. Set ASR_BIN_DOWNLOAD_URL to download it, or place it manually.'
    )
  }

  const ttsBin = resolveBin('kitten-tts-server')
  const asrBin = resolveBin('asr-server')
  const ttsModel = config.ttsModelPath
  const asrModel = config.asrModelPath
  const env = { ...process.env, RUST_LOG: 'off' }

  console.log('Starting TTS server...')
  console.log(`  bin: ${ttsBin}`)
  console.log(`  model: ${ttsModel}`)
  ttsProcess = spawn(ttsBin, [ttsModel, '--port', String(config.ttsPort)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd(),
    env
  })
  ttsProcess.stdout?.on('data', (d: Buffer) => log('TTS', d))
  ttsProcess.stderr?.on('data', (d: Buffer) => log('TTS', d))
  ttsProcess.on('exit', (code) => {
    if (code !== null && code !== 0) console.log(`[TTS] exited with code ${code}`)
  })

  console.log('Starting ASR server...')
  console.log(`  bin: ${asrBin}`)
  console.log(`  model: ${asrModel}`)
  asrProcess = spawn(asrBin, ['--model-dir', asrModel, '--port', String(config.asrPort)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd(),
    env
  })
  asrProcess.stdout?.on('data', (d: Buffer) => log('ASR', d))
  asrProcess.stderr?.on('data', (d: Buffer) => log('ASR', d))
  asrProcess.on('exit', (code) => {
    if (code !== null && code !== 0) console.log(`[ASR] exited with code ${code}`)
  })

  await waitForServer(`http://localhost:${config.ttsPort}/health`, 'TTS')
  await waitForServer(`http://localhost:${config.asrPort}/health`, 'ASR')
  console.log('All servers ready!\n')
}

async function waitForServer(url: string, name: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        console.log(`[${name}] server is ready`)
        return
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`[${name}] server did not become ready within ${timeoutMs}ms`)
}

function forceKill(proc: ChildProcess | null, name: string, timeoutMs = 800): void {
  if (!proc || proc.killed) return

  proc.kill('SIGTERM')

  const timer = setTimeout(() => {
    if (proc && !proc.killed) {
      console.log(`[${name}] SIGTERM ignored, forcing SIGKILL`)
      proc.kill('SIGKILL')
    }
  }, timeoutMs)

  proc.once('exit', () => clearTimeout(timer))
}

export function stopServers(): void {
  console.log('\nStopping servers...')
  forceKill(ttsProcess, 'TTS')
  forceKill(asrProcess, 'ASR')
  ttsProcess = null
  asrProcess = null
}

export function ttsUrl(config: ServerConfig): string {
  return `http://localhost:${config.ttsPort}`
}

export function asrUrl(config: ServerConfig): string {
  return `http://localhost:${config.asrPort}`
}
