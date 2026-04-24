import { describe, it, expect } from 'vitest'
import { createI18n } from '../../shared/i18n'

describe('i18n', () => {
  it('should return Chinese for zh locale', () => {
    const t = createI18n('zh-CN')
    expect(t('error.asr_empty')).toBe('没听清，能大声一点吗？')
  })

  it('should return Chinese for short zh locale', () => {
    const t = createI18n('zh')
    expect(t('error.asr_empty')).toBe('没听清，能大声一点吗？')
  })

  it('should return English for en locale', () => {
    const t = createI18n('en-US')
    expect(t('error.asr_empty')).toBe('My ears are sleepy, can you say it louder?')
  })

  it('should fall back to English for unknown locale', () => {
    const t = createI18n('ja-JP')
    expect(t('error.asr_empty')).toBe('My ears are sleepy, can you say it louder?')
  })

  it('should return key as fallback when key does not exist', () => {
    const t = createI18n('en')
    // Testing fallback for unknown keys
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(t('nonexistent.key' as any)).toBe('nonexistent.key')
  })

  it('should substitute params', () => {
    const t = createI18n('en')
    expect(t('test.greeting', { name: 'World' })).toBe('Hello World!')
  })

  it('should leave raw placeholder when param is missing', () => {
    const t = createI18n('en')
    expect(t('test.greeting')).toBe('Hello {{name}}!')
  })

  it('should substitute params in Chinese', () => {
    const t = createI18n('zh')
    expect(t('test.greeting', { name: '世界' })).toBe('你好 世界！')
  })
})
