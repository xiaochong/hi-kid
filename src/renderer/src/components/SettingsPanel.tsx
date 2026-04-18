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
      >
        <span className={styles.label}>按住说话</span>
        <span className={styles.sub}>Press &amp; Hold</span>
      </button>
      <button
        className={`${styles.modeButton} ${mode === 'vad' ? styles.active : ''}`}
        onClick={() => onModeChange('vad')}
        type="button"
        aria-pressed={mode === 'vad'}
      >
        <span className={styles.label}>自动检测</span>
        <span className={styles.sub}>Auto Listen</span>
      </button>
    </div>
  )
}
