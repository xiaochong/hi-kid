import en from './en.json'
import zh from './zh.json'

export type I18nKey = keyof typeof en

const locales: Record<string, Record<string, string>> = {
  en,
  zh
}

function getEnvLang(): string {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.LANG) {
      return process.env.LANG
    }
  } catch {
    // process not available (renderer / browser context)
  }
  return ''
}

function detectLocale(): string {
  // Main process: check process.env.LANG
  const lang = getEnvLang()
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('en')) return 'en'
  // Renderer / browser: check navigator.language
  if (typeof navigator !== 'undefined') {
    const navLang = navigator.language || ''
    if (navLang.startsWith('zh')) return 'zh'
    if (navLang.startsWith('en')) return 'en'
  }
  return 'en'
}

export function createI18n(
  locale?: string
): (key: I18nKey, params?: Record<string, string>) => string {
  const lang = (locale || detectLocale()).split('-')[0]
  const messages = locales[lang] || locales['en']

  return (key: I18nKey, params?: Record<string, string>): string => {
    let msg = messages[key]
    if (!msg) {
      // Fall back to English
      msg = locales['en'][key] || key
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{{${k}}}`, v)
      }
    }
    return msg
  }
}

export type I18nFn = ReturnType<typeof createI18n>

// Pre-initialized instance for the renderer process.
// In browsers, navigator.language correctly reflects the system UI language
// (unlike the main process where LANG env var interferes).
export const t: I18nFn = createI18n()

// Expose the detected locale so the renderer can adjust font-family etc.
export const detectedLocale: string = detectLocale().startsWith('zh') ? 'zh' : 'en'
