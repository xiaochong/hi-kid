import { useEffect, useRef } from 'react'
import { type ChatMessage } from '@renderer/types/conversation'

interface ChatBubblesProps {
  messages: ChatMessage[]
  visible: boolean
}

function TypingDots(): React.JSX.Element {
  return (
    <span className="typing-dots">
      <span />
      <span />
      <span />
    </span>
  )
}

function AssistantIcon(): React.JSX.Element {
  return (
    <span className="chat-bubble-icon" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
          fill="currentColor"
          opacity="0.3"
        />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <circle cx="15" cy="10" r="1.5" fill="currentColor" />
        <path d="M12 17c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" fill="currentColor" />
      </svg>
    </span>
  )
}

export default function ChatBubbles({
  messages,
  visible
}: ChatBubblesProps): React.JSX.Element | null {
  const endRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages])

  if (!visible) {
    return null
  }

  return (
    <div className="chat-bubbles-container" ref={containerRef}>
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'} ${msg.pending ? 'chat-bubble-placeholder' : ''}`}
        >
          {msg.role === 'assistant' && <AssistantIcon />}
          <div className="chat-bubble-text">
            {msg.pending ? <TypingDots /> : msg.text}
          </div>
        </div>
      ))}

      {messages.length === 0 && (
        <div className="chat-empty-hint">
          <span>Say hello to Kitten</span>
        </div>
      )}

      <div ref={endRef} />
    </div>
  )
}
