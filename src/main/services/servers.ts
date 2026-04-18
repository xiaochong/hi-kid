import { spawn, type ChildProcess } from 'child_process'
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

function resolveBin(name: string): string {
  const candidates = [
    path.join(process.resourcesPath, 'bin', name),
    path.join(__dirname, '../../../../bin', name),
    path.join(__dirname, '../../../bin', name),
    path.join(process.env.HOME || '', 'qwen3_asr_rs', name)
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return name
}

function toAbsolute(p: string): string {
  if (path.isAbsolute(p)) return p
  return path.resolve(__dirname, '../../../../', p)
}

function log(prefix: string, data: Buffer | string): void {
  const text = data.toString().trim()
  if (!text) return
  for (const line of text.split('\n')) {
    console.log(`[${prefix}] ${line}`)
  }
}

export async function startServers(config: ServerConfig): Promise<void> {
  const ttsBin = resolveBin('kitten-tts-server')
  const asrBin = resolveBin('asr-server')
  const ttsModel = toAbsolute(config.ttsModelPath)
  const asrModel = toAbsolute(config.asrModelPath)
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

export function stopServers(): void {
  console.log('\nStopping servers...')
  if (ttsProcess && !ttsProcess.killed) {
    ttsProcess.kill('SIGTERM')
    ttsProcess = null
  }
  if (asrProcess && !asrProcess.killed) {
    asrProcess.kill('SIGTERM')
    asrProcess = null
  }
}

export function ttsUrl(config: ServerConfig): string {
  return `http://localhost:${config.ttsPort}`
}

export function asrUrl(config: ServerConfig): string {
  return `http://localhost:${config.asrPort}`
}
