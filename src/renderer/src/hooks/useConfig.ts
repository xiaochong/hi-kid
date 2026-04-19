import { useState, useEffect } from 'react'

export interface ConfigData {
  aiName: string
  systemPrompt: string
  baseUrl: string
  apiKey: string
  modelName: string
}

interface UseConfigReturn {
  config: ConfigData | null
  loading: boolean
  error: string | null
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    window.api
      .getConfig()
      .then((data) => {
        if (!cancelled) {
          setConfig(data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          setError(message)
          setLoading(false)
        }
      })

    const unsubscribe = window.api.onConfigChanged((newConfig) => {
      setConfig(newConfig)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return { config, loading, error }
}
