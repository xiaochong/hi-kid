import { useState, useEffect, useCallback } from 'react'
import { type KittenState, type ChatMessage } from '@renderer/types/conversation'

type Mode = 'press-and-hold' | 'vad'

const MODE_KEY = 'echokid-mode'

function loadMode(): Mode {
  try {
    const saved = localStorage.getItem(MODE_KEY)
    if (saved === 'vad' || saved === 'press-and-hold') return saved
  } catch {
    // ignore
  }
  return 'press-and-hold'
}

function saveMode(mode: Mode): void {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // ignore
  }
}

export interface UseConversationReturn {
  kittenState: KittenState
  isRecording: boolean
  messages: ChatMessage[]
  servicesReady: boolean
  error: string | null
  mode: Mode
  startRecording: () => void
  stopRecording: () => void
  interrupt: () => void
  setMode: (mode: Mode) => void
  clearError: () => void
}

export function useConversation(): UseConversationReturn {
  const [kittenState, setKittenState] = useState<KittenState>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [servicesReady, setServicesReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setModeState] = useState<Mode>(loadMode)

  useEffect(() => {
    const unsubscribeStatus = window.api.onServiceStatus((status) => {
      setServicesReady(status.ready)
    })

    const unsubscribeKittenState = window.api.onKittenState((state) => {
      setKittenState(state)
    })

    const unsubscribeTranscription = window.api.onTranscription((data) => {
      setMessages((prev) => [...prev, { role: 'user', text: data.text }])
    })

    const unsubscribeLlmDelta = window.api.onLlmDelta((data) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.role === 'assistant') {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', text: last.text + data.text }
          return updated
        }
        return [...prev, { role: 'assistant', text: data.text }]
      })
    })

    const unsubscribeTtsEvent = window.api.onTtsEvent((event) => {
      console.log('[TTS]', event)
    })

    const unsubscribeError = window.api.onError((data) => {
      setError(data.message)
    })

    return () => {
      unsubscribeStatus()
      unsubscribeKittenState()
      unsubscribeTranscription()
      unsubscribeLlmDelta()
      unsubscribeTtsEvent()
      unsubscribeError()
    }
  }, [])

  const startRecording = useCallback(() => {
    setIsRecording(true)
    window.api.startRecording().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
      setIsRecording(false)
    })
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    window.api.stopRecording().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    })
  }, [])

  const interrupt = useCallback(() => {
    window.api.interrupt().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    })
  }, [])

  const setMode = useCallback((next: Mode) => {
    setModeState(next)
    saveMode(next)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    kittenState,
    isRecording,
    messages,
    servicesReady,
    error,
    mode,
    startRecording,
    stopRecording,
    interrupt,
    setMode,
    clearError
  }
}
