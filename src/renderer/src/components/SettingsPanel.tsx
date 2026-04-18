import styles from './SettingsPanel.module.css'

interface SettingsPanelProps {
  mode: 'press-and-hold' | 'vad'
  onModeChange: (mode: 'press-and-hold' | 'vad') => void
}

export default function SettingsPanel({
  mode,
  onModeChange
}: SettingsPanelProps): React.JSX.Element {
  return (
    <div className={styles.panel}>
      <button
        className={`${styles.modeButton} ${mode === 'press-and-hold' ? styles.active : ''}`}
        onClick={() => onModeChange('press-and-hold')}
        type="button"
        aria-pressed={mode === 'press-and-hold'}
        title="Press & Hold"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 0 1 2 2v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        <span className={styles.sub}>Hold</span>
      </button>
      <button
        className={`${styles.modeButton} ${mode === 'vad' ? styles.active : ''}`}
        onClick={() => onModeChange('vad')}
        type="button"
        aria-pressed={mode === 'vad'}
        title="Auto Listen"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 10v3" />
          <path d="M6 6v11" />
          <path d="M10 3v18" />
          <path d="M14 8v7" />
          <path d="M18 5v13" />
          <path d="M22 10v3" />
        </svg>
        <span className={styles.sub}>Auto</span>
      </button>
    </div>
  )
}
