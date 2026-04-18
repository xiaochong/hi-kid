interface TextToggleProps {
  enabled: boolean
  onToggle: () => void
}

export default function TextToggle({ enabled, onToggle }: TextToggleProps): React.JSX.Element {
  return (
    <button
      className="text-toggle"
      onClick={onToggle}
      type="button"
      aria-pressed={enabled}
      aria-label="Toggle subtitles"
      title="Toggle subtitles"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
      <span className="text-toggle-label">Chat</span>
      <span className={`text-toggle-switch ${enabled ? 'on' : 'off'}`}>
        <span className="text-toggle-knob" />
      </span>
    </button>
  )
}
