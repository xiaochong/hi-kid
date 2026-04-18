import { useEffect, useState } from 'react'
import { Button } from 'animal-island-ui'

type Screen = 'loading' | 'download' | 'onboarding' | 'conversation'

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('loading')
  const [servicesReady, setServicesReady] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Starting up...')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribeStatus = window.api.onServiceStatus((status) => {
      setServicesReady(status.ready)
      if (status.ready) {
        setStatusMessage('Ready!')
        setScreen('conversation')
      } else {
        setStatusMessage('Services stopped')
      }
    })

    const unsubscribeError = window.api.onError((data) => {
      setErrorMessage(data.message)
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
      setErrorMessage(message)
      setStatusMessage(`Failed to start: ${message}`)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">EchoKid</h1>
        <div className="app-settings">
          <span className="sr-only">Settings area</span>
          <Button type="default" size="small" onClick={handleStartServices}>
            Start Services
          </Button>
        </div>
      </header>

      <main className="app-stage">
        {screen === 'loading' && (
          <>
            <div className="kitten-placeholder">
              <span className="kitten-label">Kitten</span>
            </div>
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
            <div className="kitten-placeholder">
              <span className="kitten-label">Kitten</span>
            </div>
            <div className="mic-area">
              <button
                className="mic-button-placeholder"
                aria-label="Hold to speak"
                onClick={() => {
                  /* TODO: voice interaction */
                }}
              >
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
              </button>
              <span className="mic-label">Hold to speak</span>
            </div>
          </>
        )}

        {(screen === 'download' || screen === 'onboarding') && (
          <div className="kitten-placeholder">
            <span className="kitten-label">Coming soon</span>
          </div>
        )}
      </main>

      <footer className="status-bar">
        <span
          className={`status-dot ${servicesReady ? 'ready' : ''} ${errorMessage ? 'error' : ''}`}
          aria-hidden="true"
        />
        <span>{statusMessage}</span>
      </footer>
    </div>
  )
}

export default App
