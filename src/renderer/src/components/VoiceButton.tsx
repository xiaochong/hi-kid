import { useState } from 'react'
import styles from './VoiceButton.module.css'

interface VoiceButtonProps {
  isRecording: boolean
  onPointerDown: () => void
  onPointerUp: () => void
  disabled?: boolean
}

export default function VoiceButton({
  isRecording,
  onPointerDown,
  onPointerUp,
  disabled = false
}: VoiceButtonProps): React.JSX.Element {
  const [isPressed, setIsPressed] = useState(false)

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>): void => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsPressed(true)
    onPointerDown()
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>): void => {
    if (!isPressed) return
    setIsPressed(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // pointer capture may already be released
    }
    if (!disabled) onPointerUp()
  }

  return (
    <button
      className={`${styles.voiceButton} ${isRecording ? styles.recording : ''}`}
      aria-label="Hold to speak"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      disabled={disabled}
      type="button"
    >
      <span className={styles.icon}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </span>
      {isRecording && <span className={styles.pulse} />}
    </button>
  )
}
