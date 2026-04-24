import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('agent', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should log warning when TTS warm-up fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Connection refused')))
    )

    const { createAgent } = await import('../services/agent')
    await createAgent({
      baseUrl: 'http://localhost:11434',
      apiKey: '',
      modelName: 'qwen3',
      ttsPort: 8081,
      aiName: 'Test',
      systemPrompt: 'You are a test assistant.'
    })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    // logger.warn prefixes with [HH:MM:SS.mmm] [WARN ], message is the second arg
    expect(warnSpy.mock.calls[0][1]).toContain('TTS warm-up failed')
    warnSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
