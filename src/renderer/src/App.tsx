import { useEffect, useState } from 'react'
import Kitten from '@renderer/components/Kitten'
import VoiceButton from '@renderer/components/VoiceButton'
import SettingsPanel from '@renderer/components/SettingsPanel'
import { useConversation } from '@renderer/hooks/useConversation'

type Screen = 'loading' | 'download' | 'onboarding' | 'conversation'

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('loading')
  const [statusMessage, setStatusMessage] = useState('Starting up...')

  const {
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
  } = useConversation()

  useEffect(() => {
    const unsubscribeStatus = window.api.onServiceStatus((status) => {
      if (status.ready) {
        setStatusMessage('Ready!')
        setScreen('conversation')
      } else {
        setStatusMessage('Services stopped')
      }
    })

    const unsubscribeError = window.api.onError((data) => {
      setStatusMessage(`Error: ${data.message}`)
    })

    return () => {
      unsubscribeStatus()
      unsubscribeError()
    }
  }, [])

  const handleStartServices = async (): Promise<void> => {
    try {
      setStatusMessage('Starting services...')
      await window.api.startServices()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStatusMessage(`Failed to start: ${message}`)
    }
  }

  const showVoiceButton = mode === 'press-and-hold'

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">EchoKid</h1>
        <div className="app-settings">
          {screen === 'conversation' && <SettingsPanel mode={mode} onModeChange={setMode} />}
          {screen !== 'conversation' && (
            <button className="start-services-btn" onClick={handleStartServices} type="button">
              Start Services
            </button>
          )}
        </div>
      </header>

      <main className="app-stage">
        {screen === 'loading' && (
          <>
            <Kitten state={kittenState} />
            <div className="mic-area">
              <div className="mic-button-placeholder" aria-label="Microphone button placeholder">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6b4c3b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <span className="mic-label">Tap to talk</span>
            </div>
          </>
        )}

        {screen === 'conversation' && (
          <>
            <Kitten state={kittenState} />

            {error && (
              <div className="error-toast">
                <span className="error-toast-text">{error}</span>
                <button
                  className="error-toast-close"
                  onClick={clearError}
                  type="button"
                  aria-label="Dismiss error"
                >
                  &times;
                </button>
              </div>
            )}

            <div className="mic-area">
              {showVoiceButton ? (
                <>
                  <VoiceButton
                    isRecording={isRecording}
                    onPointerDown={startRecording}
                    onPointerUp={stopRecording}
                    disabled={!servicesReady}
                  />
                  <span className="mic-label">
                    {isRecording ? 'Listening...' : 'Hold to speak'}
                  </span>
                </>
              ) : (
                <div className="vad-indicator">
                  <span className="vad-dot" />
                  <span className="mic-label">Listening...</span>
                </div>
              )}
            </div>

            {messages.length > 0 && (
              <div className="messages-badge">
                <span className="messages-count">{messages.length}</span>
                <span className="messages-label">messages</span>
              </div>
            )}
          </>
        )}

        {(screen === 'download' || screen === 'onboarding') && <Kitten state={kittenState} />}
      </main>

      <footer className="status-bar">
        <span
          className={`status-dot ${servicesReady ? 'ready' : ''} ${error ? 'error' : ''}`}
          aria-hidden="true"
        />
        <span>{statusMessage}</span>
        {kittenState === 'speaking' && (
          <button className="interrupt-btn" onClick={interrupt} type="button">
            Stop
          </button>
        )}
      </footer>
    </div>
  )
}

export default App
