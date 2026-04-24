import { describe, it, expect } from 'vitest'
import { getInstallManifest } from '../services/releases'

describe('getInstallManifest', () => {
  it('should return directDownloads and archives', () => {
    const manifest = getInstallManifest('/bin', '/models')
    expect(manifest.directDownloads).toBeDefined()
    expect(manifest.archives).toBeDefined()
    expect(manifest.directDownloads.length).toBeGreaterThan(0)
    expect(manifest.archives.length).toBeGreaterThan(0)
  })

  it('should include ASR model config and weights as direct downloads', () => {
    const manifest = getInstallManifest('/bin', '/models')
    const names = manifest.directDownloads.map((d) => d.name)
    expect(names).toContain('ASR Model Config')
    expect(names).toContain('ASR Model Weights')
  })

  it('should include TTS Server, TTS Model, and ASR Server archives', () => {
    const manifest = getInstallManifest('/bin', '/models')
    const names = manifest.archives.map((a) => a.name)
    expect(names).toContain('TTS Server')
    expect(names).toContain('TTS Model')
    expect(names).toContain('ASR Server & Assets')
  })

  it('should mark binaries as executable', () => {
    const manifest = getInstallManifest('/bin', '/models')
    const allEntries = manifest.archives.flatMap((a) => a.entries)
    const executables = allEntries.filter((e) => e.executable)
    const execNames = executables.map((e) => e.archivePath)
    expect(execNames).toContain('kitten-tts-aarch64-macos/kitten-tts-server')
    expect(execNames).toContain('asr-macos-aarch64/asr-server')
  })

  it('should use provided binDir and modelsDir in paths', () => {
    const manifest = getInstallManifest('/custom/bin', '/custom/models')
    // Check that paths use the provided directories
    const ttsServerPath = manifest.archives.find((a) => a.name === 'TTS Server')!.entries[0]
      .localPath
    expect(ttsServerPath).toBe('/custom/bin/kitten-tts-server')

    const configPath = manifest.directDownloads.find(
      (d) => d.name === 'ASR Model Config'
    )!.localPath
    expect(configPath).toBe('/custom/models/qwen3_asr_rs/Qwen3-ASR-0.6B/config.json')
  })

  it('should have positive sizes for all downloads', () => {
    const manifest = getInstallManifest('/bin', '/models')
    const allSizes = [
      ...manifest.directDownloads.map((d) => d.size),
      ...manifest.archives.map((a) => a.size)
    ]
    for (const size of allSizes) {
      expect(size).toBeGreaterThan(0)
    }
  })

  it('should have valid URLs for all downloads', () => {
    const manifest = getInstallManifest('/bin', '/models')
    const allUrls = [
      ...manifest.directDownloads.map((d) => d.url),
      ...manifest.archives.map((a) => a.url)
    ]
    for (const url of allUrls) {
      expect(url).toMatch(/^https:\/\//)
    }
  })

  it('should have valid archive types', () => {
    const manifest = getInstallManifest('/bin', '/models')
    for (const archive of manifest.archives) {
      expect(['tar.gz', 'zip']).toContain(archive.type)
    }
  })
})
