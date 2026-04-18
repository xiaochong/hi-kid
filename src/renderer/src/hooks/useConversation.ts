import { useState, useEffect, useCallback } from 'react'
import { type KittenState, type ChatMessage } from '@renderer/types/conversation'

type Mode = 'press-and-hold' | 'vad'

let audioCtx: AudioContext | null = null

function playSendSound(): void {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.04)
    osc.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.15)
  } catch {
    // ignore audio errors
  }
}

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
  isProcessing: boolean
  messages: ChatMessage[]
  servicesReady: boolean
  error: string | null
  mode: Mode
  startRecording: () => void
  stopRecording: () => void
  interrupt: () => void
  setMode: (mode: Mode) => void
  clearError: () => void
  clearMessages: () => void
}

export function useConversation(): UseConversationReturn {
  const [kittenState, setKittenState] = useState<KittenState>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [servicesReady, setServicesReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setModeState] = useState<Mode>(loadMode)

  useEffect(() => {
    const unsubscribeStatus = window.api.onServiceStatus((status) => {
      setServicesReady(status.ready)
    })

    const unsubscribeKittenState = window.api.onKittenState((state) => {
      setKittenState(() => {
        if (state !== 'listening') {
          setIsProcessing(false)
        }
        return state
      })
      if (state === 'thinking') {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant' && last.pending) return prev
          return [...prev, { role: 'assistant', text: '', pending: true }]
        })
      }
    })

    const unsubscribeTranscription = window.api.onTranscription((data) => {
      if (!data.text) {
        // Recording was empty or cancelled — remove pending placeholder
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'user' && last.pending) {
            return prev.slice(0, -1)
          }
          return prev
        })
        return
      }
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.role === 'user' && last.pending) {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'user', text: data.text }
          return updated
        }
        return [...prev, { role: 'user', text: data.text }]
      })
    })

    const unsubscribeLlmDelta = window.api.onLlmDelta((data) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.role === 'assistant' && last.pending) {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', text: data.text }
          return updated
        }
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
      setIsProcessing(false)
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
    window.api
      .startRecording()
      .then((started) => {
        if (!started) {
          setIsRecording(false)
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
        setIsRecording(false)
      })
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    setIsProcessing(true)
    playSendSound()
    setMessages((prev) => [...prev, { role: 'user', text: '', pending: true }])
    window.api.stopRecording().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
      setIsProcessing(false)
    })
  }, [])

  const interrupt = useCallback(() => {
    window.api.interrupt().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    })
  }, [])

  const setMode = useCallback(
    (next: Mode) => {
      if (next === mode) return
      // Interrupt any ongoing flow in main process and reset local state
      window.api.stopRecording().catch(() => {})
      window.api.interrupt().catch(() => {})
      setIsRecording(false)
      setIsProcessing(false)
      setKittenState('idle')
      setModeState(next)
      saveMode(next)
    },
    [mode]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    window.api.resetConversation().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    })
  }, [])

  // VAD mode: auto-restart listening after each conversation turn
  useEffect(() => {
    if (mode !== 'vad' || !servicesReady) return
    if (isRecording || isProcessing || kittenState !== 'idle' || error) return

    const timer = setTimeout(() => {
      window.api.startRecording().catch((err: unknown) => {
        console.error('VAD auto-start error:', err)
      })
    }, 800)

    return () => clearTimeout(timer)
  }, [mode, servicesReady, isRecording, isProcessing, kittenState, error])

  return {
    kittenState,
    isRecording,
    isProcessing,
    messages,
    servicesReady,
    error,
    mode,
    startRecording,
    stopRecording,
    interrupt,
    setMode,
    clearError,
    clearMessages
  }
}
