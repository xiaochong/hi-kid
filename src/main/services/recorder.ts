import { spawn, execSync, type ChildProcess } from 'child_process'
import fs from 'fs'

// VAD: start when above threshold for 0.2s, stop when below threshold for 0.8s
export const SILENCE_ABOVE = '1.5%'
export const SILENCE_BELOW = '1.5%'
export const MAX_RECORD_SECONDS = 10
export const MIN_VALID_RMS = 0.001
export const POST_SPEECH_DELAY_MS = 500 // wait after TTS finishes before recording

let currentRec: ChildProcess | null = null

export function recordWithVad(outputPath: string): Promise<void> {
  return new Promise((resolve) => {
    currentRec = spawn(
      'rec',
      [
        '-c',
        '1',
        outputPath,
        'silence',
        '1',
        '0.2',
        SILENCE_ABOVE,
        '1',
        '1.5',
        SILENCE_BELOW,
        'trim',
        '0',
        String(MAX_RECORD_SECONDS)
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    )

    currentRec.stderr?.on('data', () => {}) // drain
    currentRec.on('close', () => {
      currentRec = null
      resolve()
    })
    currentRec.on('error', () => {
      currentRec = null
      resolve()
    })
  })
}

export function stopRecordingProcess(): void {
  if (currentRec && !currentRec.killed) {
    currentRec.kill('SIGTERM')
    currentRec = null
  }
}

export function convertAudio(inputPath: string, outputPath: string): void {
  execSync(`sox "${inputPath}" -r 16000 -b 16 "${outputPath}"`, { stdio: 'ignore' })
}

export function analyzeAudio(audioPath: string): { rms: number; size: number; duration: number } {
  try {
    const size = fs.statSync(audioPath).size
    const statOutput = execSync(`sox "${audioPath}" -n stat 2>&1`, { encoding: 'utf-8' })
    const rmsMatch = statOutput.match(/RMS\s+amplitude:\s+([\d.eE+-]+)/)
    const durMatch = statOutput.match(/Length\s+\(seconds\):\s+([\d.eE+-]+)/)
    return {
      rms: rmsMatch ? parseFloat(rmsMatch[1]) : 0,
      size,
      duration: durMatch ? parseFloat(durMatch[1]) : 0
    }
  } catch {
    return { rms: 0, size: 0, duration: 0 }
  }
}
