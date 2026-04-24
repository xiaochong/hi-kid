export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

const ENABLED_LEVEL: number = (() => {
  const env = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined
  if (env && env in LEVELS) return LEVELS[env]
  // Default: show info and above in dev, warn and above in production
  return process.env.NODE_ENV === 'production' ? LEVELS.warn : LEVELS.info
})()

function formatTime(): string {
  const d = new Date()
  return d.toISOString().slice(11, 23) // HH:MM:SS.mmm
}

function log(level: LogLevel, ...args: unknown[]): void {
  if (LEVELS[level] < ENABLED_LEVEL) return
  const label = level.toUpperCase().padEnd(5)
  const prefix = `[${formatTime()}] [${label}]`
  switch (level) {
    case 'error':
      console.error(prefix, ...args)
      break
    case 'warn':
      console.warn(prefix, ...args)
      break
    default:
      console.log(prefix, ...args)
  }
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args)
}
