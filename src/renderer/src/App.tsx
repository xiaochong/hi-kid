import { useEffect, useRef, useState } from 'react'
import Kitten from '@renderer/components/Kitten'
import VoiceButton from '@renderer/components/VoiceButton'
import SettingsPanel from '@renderer/components/SettingsPanel'
import TextToggle from '@renderer/components/TextToggle'
import ChatBubbles from '@renderer/components/ChatBubbles'
import DownloadScreen from '@renderer/components/DownloadScreen'
import DepsSetupScreen from '@renderer/components/DepsSetupScreen'
import OnboardingScreen from '@renderer/components/OnboardingScreen'
import IdeasMenu from '@renderer/components/IdeasMenu'
import { useConversation } from '@renderer/hooks/useConversation'
import { useConfig } from '@renderer/hooks/useConfig'

type Screen = 'loading' | 'deps-setup' | 'download' | 'onboarding' | 'conversation'

interface DepsState {
  sox: boolean
  espeakNg: boolean
  ollama: boolean
}

interface DownloadProgress {
  bytes: number
  total: number
  currentFile: string
}

const TEXT_ENABLED_KEY = 'hikid-text-enabled'
const ONBOARDED_KEY = 'hikid-onboarded'

function loadTextEnabled(): boolean {
  try {
    const saved = localStorage.getItem(TEXT_ENABLED_KEY)
    return saved === 'true'
  } catch {
    return false
  }
}

function saveTextEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(TEXT_ENABLED_KEY, String(enabled))
  } catch {
    // ignore
  }
}

function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === 'true'
  } catch {
    return false
  }
}

function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, 'true')
  } catch {
    // ignore
  }
}

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('loading')
  const [statusMessage, setStatusMessage] = useState('Starting up...')
  const [textEnabled, setTextEnabled] = useState<boolean>(loadTextEnabled)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    bytes: 0,
    total: 0,
    currentFile: ''
  })
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [deps, setDeps] = useState<DepsState>({ sox: true, espeakNg: true, ollama: true })

  const {
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
    clearMessages,
    addSystemMessage
  } = useConversation()

  const { config: appConfig } = useConfig()
  const aiName = appConfig?.aiName ?? 'Kitten'

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!topicDropdownOpen) return
    const handleClick = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTopicDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [topicDropdownOpen])

  useEffect(() => {
    const unsubscribeStatus = window.api.onServiceStatus((status) => {
      if (status.ready) {
        setStatusMessage('Ready!')
        setScreen(hasOnboarded() ? 'conversation' : 'onboarding')
      } else {
        setStatusMessage('Services stopped')
      }
    })

    const unsubscribeError = window.api.onError((data) => {
      setStatusMessage(`Error: ${data.message}`)
    })

    const unsubscribeDownload = window.api.onDownloadProgress((progress) => {
      setDownloadProgress(progress)
    })

    // Auto-check dependencies and models on mount
    const checkAndStart = async (): Promise<void> => {
      try {
        // Step 1: Check system dependencies
        setStatusMessage('Checking dependencies...')
        const depsResult = await window.api.checkDependencies()
        setDeps(depsResult)

        if (!depsResult.sox || !depsResult.espeakNg) {
          setScreen('deps-setup')
          setStatusMessage('Missing system dependencies')
          return
        }

        // Step 2: Check models / binaries
        setStatusMessage('Checking models...')
        const { exists } = await window.api.checkModels()
        if (exists) {
          setStatusMessage('Starting services...')
          await window.api.startServices()
        } else {
          setStatusMessage('Downloading models...')
          setScreen('download')
          await window.api.startDownload()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setStatusMessage(`Startup error: ${message}`)
      }
    }

    checkAndStart()

    return () => {
      unsubscribeStatus()
      unsubscribeError()
      unsubscribeDownload()
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

  const handleDepsResolved = async (): Promise<void> => {
    setScreen('loading')
    setStatusMessage('Re-checking dependencies...')
    try {
      const depsResult = await window.api.checkDependencies()
      setDeps(depsResult)

      if (!depsResult.sox || !depsResult.espeakNg) {
        setScreen('deps-setup')
        setStatusMessage('Still missing dependencies')
        return
      }

      // Continue to model check
      setStatusMessage('Checking models...')
      const { exists } = await window.api.checkModels()
      if (exists) {
        setStatusMessage('Starting services...')
        await window.api.startServices()
      } else {
        setStatusMessage('Downloading models...')
        setScreen('download')
        await window.api.startDownload()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStatusMessage(`Startup error: ${message}`)
    }
  }

  const handleToggleText = (): void => {
    const next = !textEnabled
    setTextEnabled(next)
    saveTextEnabled(next)
  }

  const handleCompleteOnboarding = (): void => {
    markOnboarded()
    setScreen('conversation')
  }

  const handleTopicClick = (topic: string): void => {
    window.api.sendMessage(topic).catch((err: unknown) => {
      console.error('Topic send error:', err)
    })
  }

  const handleGameStart = async (game: { rules: string }): Promise<void> => {
    addSystemMessage(game.rules)
    try {
      await window.api.sendMessage(game.rules)
    } catch (err) {
      console.error('Game start error:', err)
      addSystemMessage("Oops, the game couldn't start. Let's try again!")
    }
    setTopicDropdownOpen(false)
  }

  const handleCancelDownload = async (): Promise<void> => {
    try {
      await window.api.cancelDownload()
      setStatusMessage('Download cancelled')
    } catch (err) {
      console.error('Cancel download error:', err)
    }
  }

  const handleResumeDownload = async (): Promise<void> => {
    setStatusMessage('Resuming download...')
    setScreen('download')
    try {
      await window.api.startDownload()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStatusMessage(`Download error: ${message}`)
    }
  }

  const showVoiceButton = mode === 'press-and-hold'

  const showSidebar = screen === 'conversation' && textEnabled

  function getMicLabel(): string {
    if (isRecording) return 'Listening...'
    if (isProcessing || kittenState === 'thinking') return 'Thinking...'
    if (kittenState === 'speaking') return 'Speaking...'
    if (mode === 'vad') return 'Listening...'
    return 'Hold to speak'
  }

  return (
    <div className="app-shell">
      <div className="app-main">
        <header className="app-header">
          <div className="app-header-left">
            {screen === 'conversation' && (
              <div className="topic-dropdown" ref={dropdownRef}>
                <button
                  className={`topic-dropdown-btn ${topicDropdownOpen ? 'open' : ''}`}
                  onClick={() => setTopicDropdownOpen((prev) => !prev)}
                  type="button"
                  aria-label="Topic suggestions"
                  title="Topic suggestions"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>Ideas</span>
                </button>
                {topicDropdownOpen && (
                  <div className="topic-dropdown-panel">
                    <IdeasMenu
                      key={topicDropdownOpen ? 'open' : 'closed'}
                      onTopicClick={(topic) => {
                        handleTopicClick(topic)
                        setTopicDropdownOpen(false)
                      }}
                      onGameStart={handleGameStart}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="app-settings">
            {screen === 'conversation' && (
              <>
                <SettingsPanel mode={mode} onModeChange={setMode} />
                <TextToggle enabled={textEnabled} onToggle={handleToggleText} />
              </>
            )}
            {(screen === 'loading' || screen === 'download') && (
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
                      disabled={
                        !servicesReady ||
                        isProcessing ||
                        kittenState === 'thinking' ||
                        kittenState === 'speaking'
                      }
                    />
                    <span className="mic-label">{getMicLabel()}</span>
                  </>
                ) : (
                  <div className="vad-indicator">
                    {(kittenState === 'idle' || kittenState === 'listening') && (
                      <span className="vad-dot" />
                    )}
                    {(isProcessing || kittenState === 'thinking') && (
                      <span className="thinking-spinner" aria-hidden="true" />
                    )}
                    {kittenState === 'speaking' && (
                      <span className="speaking-wave" aria-hidden="true" />
                    )}
                    <span className="mic-label">{getMicLabel()}</span>
                  </div>
                )}
              </div>

              {messages.length > 0 && (
                <div className="messages-badge">
                  <span className="messages-count">{messages.length}</span>
                  <span className="messages-label">messages</span>
                  <button
                    className="messages-clear-btn"
                    onClick={clearMessages}
                    type="button"
                    aria-label="Clear conversation"
                    title="Clear conversation"
                  >
                    ×
                  </button>
                </div>
              )}
            </>
          )}

          {screen === 'deps-setup' && (
            <DepsSetupScreen
              missingSox={!deps.sox}
              missingEspeakNg={!deps.espeakNg}
              onCheckAgain={handleDepsResolved}
              aiName={aiName}
            />
          )}

          {screen === 'download' && (
            <>
              <DownloadScreen
                bytes={downloadProgress.bytes}
                total={downloadProgress.total}
                currentFile={downloadProgress.currentFile}
                aiName={aiName}
              />
              <div
                className="download-actions"
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  marginTop: '16px'
                }}
              >
                {downloadProgress.currentFile !== 'Complete!' &&
                  downloadProgress.currentFile !== '' && (
                    <button
                      className="start-services-btn"
                      onClick={handleCancelDownload}
                      type="button"
                    >
                      Cancel
                    </button>
                  )}
                {(downloadProgress.currentFile === '' ||
                  downloadProgress.currentFile === 'Complete!') && (
                  <button
                    className="start-services-btn"
                    onClick={handleResumeDownload}
                    type="button"
                  >
                    Resume Download
                  </button>
                )}
              </div>
            </>
          )}

          {screen === 'onboarding' && (
            <OnboardingScreen onStart={handleCompleteOnboarding} aiName={aiName} />
          )}
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

      {showSidebar && (
        <aside className="chat-sidebar">
          <ChatBubbles messages={messages} visible aiName={aiName} />
        </aside>
      )}
    </div>
  )
}

export default App
