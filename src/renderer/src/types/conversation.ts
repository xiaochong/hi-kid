export type KittenState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  text: string
  pending?: boolean
}
