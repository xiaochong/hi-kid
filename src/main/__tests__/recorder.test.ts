import { describe, it, expect } from 'vitest'
import {
  SILENCE_ABOVE,
  SILENCE_BELOW,
  MAX_RECORD_SECONDS,
  MIN_VALID_RMS,
  POST_SPEECH_DELAY_MS
} from '../services/recorder'

describe('recorder constants', () => {
  it('should have silence thresholds as percentage strings', () => {
    expect(SILENCE_ABOVE).toBe('1.5%')
    expect(SILENCE_BELOW).toBe('1.5%')
  })

  it('should have a reasonable max recording duration', () => {
    expect(MAX_RECORD_SECONDS).toBe(10)
  })

  it('should have a small minimum RMS threshold', () => {
    expect(MIN_VALID_RMS).toBeGreaterThan(0)
    expect(MIN_VALID_RMS).toBeLessThan(0.01)
  })

  it('should have a post-speech delay in milliseconds', () => {
    expect(POST_SPEECH_DELAY_MS).toBe(500)
  })
})
