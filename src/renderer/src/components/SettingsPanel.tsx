import { useState, useEffect, useRef, useCallback } from 'react'
import { useConfig } from '@renderer/hooks/useConfig'
import styles from './SettingsPanel.module.css'
import { t } from '@shared/i18n'

interface SettingsPanelProps {
  mode: 'press-and-hold' | 'vad'
  onModeChange: (mode: 'press-and-hold' | 'vad') => void
}

export default function SettingsPanel({
  mode,
  onModeChange
}: SettingsPanelProps): React.JSX.Element {
  const [panelOpen, setPanelOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const { config, loading } = useConfig()
  const panelRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    aiName: '',
    systemPrompt: '',
    baseUrl: '',
    apiKey: '',
    modelName: ''
  })

  // Close panel on click outside or escape
  useEffect(() => {
    if (!panelOpen) return

    const handleClick = (e: MouseEvent): void => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setPanelOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [panelOpen])

  // Toast auto-dismiss
  useEffect(() => {
    if (!showToast) return
    const timer = setTimeout(() => setShowToast(false), 2500)
    return () => clearTimeout(timer)
  }, [showToast])

  const updateField = useCallback((field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveError(null)
  }, [])

  const isValid =
    form.aiName.length <= 32 &&
    form.modelName.length <= 128 &&
    form.baseUrl.length > 0 &&
    form.baseUrl.length <= 512

  const handleSave = async (): Promise<void> => {
    if (!isValid) return
    setSaving(true)
    setSaveError(null)
    try {
      await window.api.setConfig({
        aiName: form.aiName.trim() || 'Kitten',
        systemPrompt: form.systemPrompt,
        baseUrl: form.baseUrl.trim(),
        apiKey: form.apiKey,
        modelName: form.modelName.trim()
      })
      setShowToast(true)
      setPanelOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.wrapper} ref={panelRef}>
      <div className={styles.panel}>
        <button
          className={`${styles.modeButton} ${mode === 'press-and-hold' ? styles.active : ''}`}
          onClick={() => onModeChange('press-and-hold')}
          type="button"
          aria-pressed={mode === 'press-and-hold'}
          title="Press & Hold"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 10v3" />
            <path d="M6 6v11" />
            <path d="M10 3v18" />
            <path d="M14 8v7" />
            <path d="M18 5v13" />
            <path d="M22 10v3" />
          </svg>
          <span className={styles.sub}>Auto</span>
        </button>
        <div className={styles.divider} />
        <button
          className={`${styles.modeButton} ${panelOpen ? styles.active : ''}`}
          onClick={() => {
            if (!panelOpen && config) {
              setForm({
                aiName: config.aiName,
                systemPrompt: config.systemPrompt,
                baseUrl: config.baseUrl,
                apiKey: config.apiKey,
                modelName: config.modelName
              })
            }
            setPanelOpen((prev) => !prev)
          }}
          type="button"
          aria-pressed={panelOpen}
          title="Settings"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {panelOpen && (
        <div className={styles.dropdown}>
          {loading ? (
            <div className={styles.skeleton}>
              <div className={styles.skeletonRow} />
              <div className={styles.skeletonRow} />
              <div className={styles.skeletonRow} />
            </div>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-aiName">
                  AI Name
                </label>
                <input
                  id="cfg-aiName"
                  className={styles.input}
                  type="text"
                  value={form.aiName}
                  onChange={(e) => updateField('aiName', e.target.value)}
                  maxLength={32}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-systemPrompt">
                  System Prompt
                </label>
                <textarea
                  id="cfg-systemPrompt"
                  className={`${styles.input} ${styles.textarea}`}
                  value={form.systemPrompt}
                  onChange={(e) => updateField('systemPrompt', e.target.value)}
                  rows={4}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-baseUrl">
                  Base URL
                </label>
                <input
                  id="cfg-baseUrl"
                  className={styles.input}
                  type="text"
                  value={form.baseUrl}
                  onChange={(e) => updateField('baseUrl', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-apiKey">
                  API Key
                </label>
                <input
                  id="cfg-apiKey"
                  className={styles.input}
                  type="text"
                  value={form.apiKey}
                  onChange={(e) => updateField('apiKey', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-modelName">
                  Model Name
                </label>
                <input
                  id="cfg-modelName"
                  className={styles.input}
                  type="text"
                  value={form.modelName}
                  onChange={(e) => updateField('modelName', e.target.value)}
                  maxLength={128}
                />
              </div>

              {saveError && <p className={styles.errorText}>{saveError}</p>}

              <div className={styles.actions}>
                <button
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={!isValid || saving}
                  type="button"
                >
                  {saving ? t('ui.saving') : t('ui.save')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showToast && <div className={styles.toast}>Settings saved!</div>}
    </div>
  )
}
