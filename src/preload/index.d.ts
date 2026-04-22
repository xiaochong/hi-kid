import { ElectronAPI } from '@electron-toolkit/preload'

type KittenState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted'

interface ConfigData {
  aiName: string
  systemPrompt: string
  baseUrl: string
  apiKey: string
  modelName: string
}

interface Api {
  // Invokes
  startServices(): Promise<void>
  stopServices(): Promise<void>
  sendMessage(text: string): Promise<void>
  interrupt(): Promise<void>
  resetConversation(): Promise<void>
  checkModels(): Promise<{ exists: boolean }>
  startDownload(): Promise<void>
  cancelDownload(): Promise<void>
  checkDependencies(): Promise<{ sox: boolean; espeakNg: boolean; ollama: boolean }>
  startRecording(): Promise<boolean>
  stopRecording(): Promise<void>
  getConfig(): Promise<ConfigData>
  setConfig(config: ConfigData): Promise<void>

  // Subscriptions
  onServiceStatus(callback: (status: { ready: boolean }) => void): () => void
  onKittenState(callback: (state: KittenState) => void): () => void
  onTranscription(callback: (data: { text: string }) => void): () => void
  onLlmDelta(callback: (data: { text: string }) => void): () => void
  onTtsEvent(callback: (event: 'start' | 'end') => void): () => void
  onDownloadProgress(
    callback: (data: { bytes: number; total: number; currentFile: string }) => void
  ): () => void
  onError(callback: (data: { message: string }) => void): () => void
  onConfigChanged(callback: (config: ConfigData) => void): () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
