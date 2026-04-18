export type KittenState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  pending?: boolean
}
