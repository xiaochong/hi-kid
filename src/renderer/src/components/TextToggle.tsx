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
      <span className="text-toggle-label">字幕 / Subtitles</span>
      <span className={`text-toggle-switch ${enabled ? 'on' : 'off'}`}>
        <span className="text-toggle-knob" />
      </span>
    </button>
  )
}
