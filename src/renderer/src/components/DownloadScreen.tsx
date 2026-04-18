import { useEffect, useState } from 'react'
import Kitten from './Kitten'

interface DownloadScreenProps {
  bytes: number
  total: number
  currentFile: string
}

export default function DownloadScreen({
  bytes,
  total,
  currentFile
}: DownloadScreenProps): React.JSX.Element {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 600)
    return () => clearInterval(interval)
  }, [])

  const percent = total > 0 ? Math.round((bytes / total) * 100) : 0
  const isComplete = percent >= 100

  const messages = [
    'Kitten is getting ready',
    'Kitten is unpacking toys',
    'Kitten is brushing fur',
    'Almost there'
  ]
  const messageIndex = Math.min(Math.floor((percent / 100) * messages.length), messages.length - 1)
  const message = isComplete ? 'All set! Starting up...' : messages[messageIndex] + dots

  return (
    <div className="download-screen">
      <div className="download-kitten">
        <Kitten state={isComplete ? 'idle' : 'thinking'} />
      </div>

      <div className="download-status">
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
      </div>
    </div>
  )
}
