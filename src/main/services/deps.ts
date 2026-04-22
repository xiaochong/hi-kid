import { execSync } from 'child_process'
import fs from 'fs'

export function findSoxTool(name: string): string | null {
  // Try PATH first
  try {
    return execSync(`which ${name}`, { encoding: 'utf-8' }).trim()
  } catch {
    // PATH didn't include Homebrew; check common install locations
    const candidates = [
      `/opt/homebrew/bin/${name}`,
      `/usr/local/bin/${name}`,
      `/opt/local/bin/${name}`
    ]
    for (const c of candidates) {
      if (fs.existsSync(c)) return c
    }
    return null
  }
}

export function checkSoxTools(): string[] {
  const missing: string[] = []
  for (const cmd of ['rec', 'sox', 'play']) {
    if (!findSoxTool(cmd)) {
      missing.push(cmd)
    }
  }
  return missing
}

export function findEspeakNg(): string | null {
  try {
    return execSync('which espeak-ng', { encoding: 'utf-8' }).trim()
  } catch {
    const candidates = [
      '/opt/homebrew/bin/espeak-ng',
      '/usr/local/bin/espeak-ng',
      '/opt/local/bin/espeak-ng'
    ]
    for (const c of candidates) {
      if (fs.existsSync(c)) return c
    }
    return null
  }
}

async function checkOllama(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal })
    clearTimeout(timeout)
    return res.ok
  } catch {
    return false
  }
}

export interface SystemDeps {
  sox: boolean
  espeakNg: boolean
  ollama: boolean
}

export async function checkSystemDeps(): Promise<SystemDeps> {
  const missingSox = checkSoxTools()
  return {
    sox: missingSox.length === 0,
    espeakNg: findEspeakNg() !== null,
    ollama: await checkOllama()
  }
}
