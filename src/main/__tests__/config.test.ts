import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Mock fs operations so tests don't touch the real filesystem
vi.mock('fs')
vi.mock('path')
vi.mock('os')

// We need to import the module under test AFTER setting up mocks
const { loadConfig, getConfig } = await import('../services/config')

describe('config', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock os.homedir()
    vi.mocked(os.homedir).mockReturnValue('/mock/home')

    // Mock path.join to behave like real path.join
    vi.mocked(path.join).mockImplementation((...args: string[]) => args.join('/'))
  })

  describe('loadConfig', () => {
    it('should return defaults when config file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = loadConfig()
      expect(config.aiName).toBe('Kitten')
      expect(config.modelName).toBe('qwen3:0.6b')
      expect(config.baseUrl).toBe('http://localhost:11434/v1')
      expect(config.apiKey).toBe('ollama')
    })

    it('should return defaults when config file has invalid JSON', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json')

      const config = loadConfig()
      // Should fall back to defaults
      expect(config.aiName).toBe('Kitten')
    })

    it('should read and return saved config values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          version: 1,
          aiName: 'TestBot',
          systemPrompt: 'You are TestBot',
          baseUrl: 'http://test:11434/v1',
          apiKey: 'test-key',
          modelName: 'test-model'
        })
      )

      const config = loadConfig()
      expect(config.aiName).toBe('TestBot')
      expect(config.modelName).toBe('test-model')
      expect(config.baseUrl).toBe('http://test:11434/v1')
      expect(config.apiKey).toBe('test-key')
      expect(config.systemPrompt).toBe('You are TestBot')
    })

    it('should trim whitespace from string fields', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          aiName: '  BotName  ',
          modelName: '  model-x  ',
          baseUrl: '  http://example.com  '
        })
      )

      const config = loadConfig()
      expect(config.aiName).toBe('BotName')
      expect(config.modelName).toBe('model-x')
      expect(config.baseUrl).toBe('http://example.com')
    })

    it('should fall back to defaults for missing fields', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          aiName: 'BotName'
          // all other fields missing
        })
      )

      const config = loadConfig()
      expect(config.aiName).toBe('BotName')
      expect(config.modelName).toBe('qwen3:0.6b') // default
      expect(config.baseUrl).toBe('http://localhost:11434/v1') // default
      expect(config.apiKey).toBe('ollama') // default
      expect(config.systemPrompt).toBeTruthy()
    })

    it('should use defaults when aiName is empty', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          aiName: '',
          modelName: 'some-model'
        })
      )

      const config = loadConfig()
      expect(config.aiName).toBe('Kitten') // default, not empty
    })

    it('should have a system prompt that mentions {{AI_NAME}} placeholder', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = loadConfig()
      expect(config.systemPrompt).toContain('{{AI_NAME}}')
    })
  })

  describe('getConfig', () => {
    it('should be an alias for loadConfig', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const c1 = loadConfig()
      const c2 = getConfig()
      expect(c1).toEqual(c2)
    })
  })
})
