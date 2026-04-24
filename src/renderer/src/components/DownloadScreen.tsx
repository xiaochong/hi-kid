import { useEffect, useState } from 'react'
import Kitten from './Kitten'

interface DownloadScreenProps {
  bytes: number
  total: number
  currentFile: string
  aiName?: string
  error?: string
  onRetry?: () => void
}

export default function DownloadScreen({
  bytes,
  total,
  currentFile,
  aiName = 'Kitten',
  error,
  onRetry
}: DownloadScreenProps): React.JSX.Element {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (error) return
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 600)
    return () => clearInterval(interval)
  }, [error])

  const percent = total > 0 ? Math.round((bytes / total) * 100) : 0
  const isComplete = percent >= 100 && !error

  const messages = [
    `${aiName} is getting ready`,
    `${aiName} is unpacking toys`,
    `${aiName} is brushing fur`,
    'Almost there'
  ]
  const messageIndex = Math.min(Math.floor((percent / 100) * messages.length), messages.length - 1)
  const message = isComplete ? 'All set! Starting up...' : messages[messageIndex] + dots

  return (
    <div className="download-screen">
      <div className="download-kitten">
        <Kitten state={error ? 'interrupted' : isComplete ? 'idle' : 'thinking'} />
      </div>

      <div className="download-status">
        {error ? (
          <>
            <p className="download-message download-error">{error}</p>
            <div className="download-progress-track">
              <div
                className="download-progress-fill download-progress-fill-error"
                style={{ width: `${percent}%` }}
              />
            </div>
            {onRetry && (
              <button className="start-services-btn" onClick={onRetry} type="button">
                Try Again
              </button>
            )}
          </>
        ) : (
          <>
            <p className="download-message">{message}</p>

            <div className="download-progress-track">
              <div className="download-progress-fill" style={{ width: `${percent}%` }} />
            </div>

            <div className="download-details">
              <span className="download-percent">{percent}%</span>
              {!isComplete && currentFile !== 'Starting...' && (
                <span className="download-file">{currentFile}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
