import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logger } from '../services/logger'

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should export debug, info, warn, error methods', () => {
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('should call console.error for error level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('test error')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toContain('[ERROR]')
    expect(spy.mock.calls[0][1]).toBe('test error')
    spy.mockRestore()
  })

  it('should call console.warn for warn level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('test warning')
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('should call console.log for info level', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.info('test info')
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('debug messages are filtered by default (LOG_LEVEL defaults to info)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    // At default level (info), debug messages should be suppressed
    logger.debug('should not appear')
    expect(spy).toHaveBeenCalledTimes(0)
    spy.mockRestore()
  })

  it('should respect LOG_LEVEL env override to debug', async () => {
    vi.stubEnv('LOG_LEVEL', 'debug')
    vi.resetModules()
    const { logger: testLogger } = await import('../services/logger')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    testLogger.debug('debug msg')
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('should respect LOG_LEVEL env override to error (suppress info)', async () => {
    vi.stubEnv('LOG_LEVEL', 'error')
    vi.resetModules()
    const { logger: testLogger } = await import('../services/logger')
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    testLogger.info('info msg')
    testLogger.error('error msg')
    expect(infoSpy).toHaveBeenCalledTimes(0)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    infoSpy.mockRestore()
    errorSpy.mockRestore()
    vi.unstubAllEnvs()
  })
})
