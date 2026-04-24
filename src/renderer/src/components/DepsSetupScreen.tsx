import { useState } from 'react'
import Kitten from './Kitten'
import { t } from '@shared/i18n'

interface DepsSetupScreenProps {
  missingSox: boolean
  missingEspeakNg: boolean
  onCheckAgain: () => void
  aiName?: string
}

export default function DepsSetupScreen({
  missingSox,
  missingEspeakNg,
  onCheckAgain,
  aiName = 'Kitten'
}: DepsSetupScreenProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const missing: string[] = []
  if (missingSox) missing.push(t('deps.sox_tools'))
  if (missingEspeakNg) missing.push(t('deps.espeak_ng'))

  const brewCommand = 'brew install sox espeak-ng'

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(brewCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.getElementById('brew-command')
      if (el) {
        const range = document.createRange()
        range.selectNode(el)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }
    }
  }

  return (
    <div className="download-screen">
      <div className="download-kitten">
        <Kitten state="thinking" />
      </div>

      <div className="download-status">
        <h2 className="download-message">{t('deps.title', { aiName })}</h2>

        <div
          style={{
            maxWidth: '620px',
            margin: '0 auto',
            textAlign: 'left',
            padding: '0 20px'
          }}
        >
          <p style={{ fontSize: '16px', lineHeight: 1.6, marginBottom: '20px' }}>
            {t('deps.body', { aiName })}{' '}
            <strong>{missing.join(' ' + t('deps.body_end') + ' ')}</strong>.
          </p>

          <div
            style={{
              background: 'rgba(255,255,255,0.7)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <code
              id="brew-command"
              style={{
                flex: 1,
                fontSize: '15px',
                fontFamily: 'monospace',
                background: '#f0f0f0',
                padding: '8px 12px',
                borderRadius: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              {brewCommand}
            </code>
            <button
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: copied ? '#86efac' : '#d4a574',
                color: copied ? '#166534' : '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                handleCopy().catch(() => {})
              }}
              type="button"
            >
              {copied ? t('ui.copied') : t('ui.copy')}
            </button>
          </div>

          <p style={{ fontSize: '14px', color: '#6b4c3b', marginBottom: '24px' }}>
            {t('deps.terminal_hint', { term: t('deps.terminal') })}
          </p>

          <button
            style={{
              display: 'block',
              width: '100%',
              padding: '14px 24px',
              borderRadius: '12px',
              border: 'none',
              background: '#8bc34a',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            onClick={onCheckAgain}
            type="button"
          >
            {t('deps.installed')}
          </button>
        </div>
      </div>
    </div>
  )
}
