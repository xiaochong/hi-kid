import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// -- Invokes (renderer -> main) --
const api = {
  startServices: (): Promise<void> => ipcRenderer.invoke('services:start'),
  stopServices: (): Promise<void> => ipcRenderer.invoke('services:stop'),
  sendMessage: (text: string): Promise<void> => ipcRenderer.invoke('agent:sendMessage', text),
  interrupt: (): Promise<void> => ipcRenderer.invoke('agent:interrupt'),
  resetConversation: (): Promise<void> => ipcRenderer.invoke('agent:reset'),
  checkModels: (): Promise<{ exists: boolean }> => ipcRenderer.invoke('models:check'),
  startDownload: (): Promise<void> => ipcRenderer.invoke('models:download'),
  cancelDownload: (): Promise<void> => ipcRenderer.invoke('models:download:cancel'),
  checkDependencies: (): Promise<{ sox: boolean; espeakNg: boolean; ollama: boolean }> =>
    ipcRenderer.invoke('deps:check'),
  startRecording: (): Promise<boolean> => ipcRenderer.invoke('recorder:start'),
  stopRecording: (): Promise<void> => ipcRenderer.invoke('recorder:stop'),
  getConfig: (): Promise<{
    aiName: string
    systemPrompt: string
    baseUrl: string
    apiKey: string
    modelName: string
  }> => ipcRenderer.invoke('config:get'),
  setConfig: (config: {
    aiName: string
    systemPrompt: string
    baseUrl: string
    apiKey: string
    modelName: string
  }): Promise<void> => ipcRenderer.invoke('config:set', config),

  // -- Subscriptions (main -> renderer) --
  onServiceStatus: (callback: (status: { ready: boolean }) => void): (() => void) => {
    const handler = (_: unknown, status: { ready: boolean }): void => callback(status)
    ipcRenderer.on('service:status', handler)
    return (): void => {
      ipcRenderer.removeListener('service:status', handler)
    }
  },

  onKittenState: (
    callback: (state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted') => void
  ): (() => void) => {
    const handler = (
      _: unknown,
      state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted'
    ): void => callback(state)
    ipcRenderer.on('kitten:state', handler)
    return (): void => {
      ipcRenderer.removeListener('kitten:state', handler)
    }
  },

  onTranscription: (callback: (data: { text: string }) => void): (() => void) => {
    const handler = (_: unknown, data: { text: string }): void => callback(data)
    ipcRenderer.on('transcription', handler)
    return (): void => {
      ipcRenderer.removeListener('transcription', handler)
    }
  },

  onLlmDelta: (callback: (data: { text: string }) => void): (() => void) => {
    const handler = (_: unknown, data: { text: string }): void => callback(data)
    ipcRenderer.on('llm:delta', handler)
    return (): void => {
      ipcRenderer.removeListener('llm:delta', handler)
    }
  },

  onTtsEvent: (callback: (event: 'start' | 'end') => void): (() => void) => {
    const handler = (_: unknown, event: 'start' | 'end'): void => callback(event)
    ipcRenderer.on('tts:event', handler)
    return (): void => {
      ipcRenderer.removeListener('tts:event', handler)
    }
  },

  onDownloadProgress: (
    callback: (data: { bytes: number; total: number; currentFile: string }) => void
  ): (() => void) => {
    const handler = (
      _: unknown,
      data: { bytes: number; total: number; currentFile: string }
    ): void => callback(data)
    ipcRenderer.on('download:progress', handler)
    return (): void => {
      ipcRenderer.removeListener('download:progress', handler)
    }
  },

  onError: (callback: (data: { message: string }) => void): (() => void) => {
    const handler = (_: unknown, data: { message: string }): void => callback(data)
    ipcRenderer.on('error', handler)
    return (): void => {
      ipcRenderer.removeListener('error', handler)
    }
  },

  onConfigChanged: (
    callback: (config: {
      aiName: string
      systemPrompt: string
      baseUrl: string
      apiKey: string
      modelName: string
    }) => void
  ): (() => void) => {
    const handler = (
      _: unknown,
      config: {
        aiName: string
        systemPrompt: string
        baseUrl: string
        apiKey: string
        modelName: string
      }
    ): void => callback(config)
    ipcRenderer.on('config:changed', handler)
    return (): void => {
      ipcRenderer.removeListener('config:changed', handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
