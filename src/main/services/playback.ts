import { spawn, type ChildProcess } from 'child_process'
import { findSoxTool } from './servers'

let currentPlayProcess: ChildProcess | null = null

export async function playSentence(text: string, baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: text,
      voice: 'Kiki',
      response_format: 'pcm',
      stream: true,
      speed: 1.0
    })
  })

  if (!res.ok || !res.body) {
    console.error('TTS HTTP error:', res.status, await res.text().catch(() => ''))
    return
  }

  const playPath = findSoxTool('play') || 'play'
  const playProcess = spawn(playPath, [
    '-t',
    'raw',
    '-r',
    '24000',
    '-b',
    '16',
    '-e',
    'signed',
    '-c',
    '1',
    '-'
  ])
  currentPlayProcess = playProcess

  const playbackPromise = new Promise<void>((resolve) => {
    playProcess.on('close', () => {
      currentPlayProcess = null
      resolve()
    })
    playProcess.on('error', () => {
      currentPlayProcess = null
      resolve()
    })
    playProcess.stdin!.on('error', () => {
      /* drain stdin errors */
    })
  })

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let sseBuffer = ''

  function flush(): void {
    try {
      sseBuffer += decoder.decode()
    } catch {
      /* ignore decode errors */
    }
    for (const line of sseBuffer.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const jsonStr = trimmed.slice(6).trim()
      if (!jsonStr) continue
      try {
        const data = JSON.parse(jsonStr) as { type?: string; delta?: string }
        if (data.type === 'speech.audio.delta' && data.delta) {
          const pcm = Buffer.from(data.delta, 'base64')
          playProcess.stdin!.write(pcm)
        }
      } catch {
        /* ignore malformed SSE json */
      }
    }
    sseBuffer = ''
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        if (value) {
          try {
            sseBuffer += decoder.decode(value, { stream: true })
          } catch {
            /* ignore decode errors */
          }
        }
        break
      }
      try {
        sseBuffer += decoder.decode(value, { stream: true })
      } catch {
        /* ignore decode errors */
      }
      const lines = sseBuffer.split(/\r?\n/)
      sseBuffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const jsonStr = trimmed.slice(6).trim()
        if (!jsonStr) continue
        try {
          const data = JSON.parse(jsonStr) as { type?: string; delta?: string }
          if (data.type === 'speech.audio.delta' && data.delta) {
            const pcm = Buffer.from(data.delta, 'base64')
            playProcess.stdin!.write(pcm)
          }
        } catch {
          /* ignore malformed SSE json */
        }
      }
    }
  } finally {
    flush()
    playProcess.stdin!.end()
  }

  await playbackPromise
}

export function stopPlayback(): void {
  if (currentPlayProcess && !currentPlayProcess.killed) {
    currentPlayProcess.kill('SIGTERM')
    currentPlayProcess = null
  }
}

export function getIsPlaying(): boolean {
  return currentPlayProcess !== null && !currentPlayProcess.killed
}
