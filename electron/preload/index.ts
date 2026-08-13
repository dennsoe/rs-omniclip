import { contextBridge, ipcRenderer, webUtils } from 'electron'

type Unsubscribe = () => void

interface ProcessingProgressData {
  id: string
  percent: number
  status: 'processing' | 'success' | 'failed'
}

interface ProcessingCompleteData {
  outputFolder: string
}

interface DownloadProgressData {
  id: string
  url: string
  percent: number
  status: 'downloading' | 'success' | 'failed'
}

interface TrimCompleteData {
  id: string
  success: boolean
  path?: string
  error?: string
}

const api = {
  // --- Kontrak inti jembatan IPC ---
  checkEngine: (): void => {
    ipcRenderer.send('engine:check')
  },

  onEngineStatus: (cb: (status: string) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, status: string): void => cb(status)
    ipcRenderer.on('engine:status', listener)
    return () => {
      ipcRenderer.removeListener('engine:status', listener)
    }
  },

  onAppReady: (cb: (isReady: boolean) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, isReady: boolean): void => cb(isReady)
    ipcRenderer.on('app:ready', listener)
    return () => {
      ipcRenderer.removeListener('app:ready', listener)
    }
  },

  startProcessing: (payload: { files: unknown[]; preset: string }): void => {
    ipcRenderer.send('processing:start', payload)
  },

  onProcessingProgress: (cb: (data: ProcessingProgressData) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, data: ProcessingProgressData): void => cb(data)
    ipcRenderer.on('processing:progress', listener)
    return () => {
      ipcRenderer.removeListener('processing:progress', listener)
    }
  },

  onProcessingComplete: (cb: (data: ProcessingCompleteData) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, data: ProcessingCompleteData): void => cb(data)
    ipcRenderer.on('processing:complete', listener)
    return () => {
      ipcRenderer.removeListener('processing:complete', listener)
    }
  },

  openFolder: (folderPath: string): void => {
    ipcRenderer.send('folder:open', folderPath)
  },

  startDownload: (payload: { url: string; id?: string }): void => {
    ipcRenderer.send('download:start', payload)
  },

  onDownloadProgress: (cb: (data: DownloadProgressData) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, data: DownloadProgressData): void => cb(data)
    ipcRenderer.on('download:progress', listener)
    return () => {
      ipcRenderer.removeListener('download:progress', listener)
    }
  },

  // --- Ekstensi (tidak mengubah kontrak inti) ---
  /** Mendapatkan jalur absolut file yang di-drop dari renderer (webUtils). */
  getPathForFile: (file: File): string => {
    return webUtils.getPathForFile(file)
  },

  /** Memotong video secara lossless. */
  trimVideo: (payload: { id: string; path: string; start: string; end: string }): void => {
    ipcRenderer.send('trim:start', payload)
  },

  onTrimComplete: (cb: (data: TrimCompleteData) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, data: TrimCompleteData): void => cb(data)
    ipcRenderer.on('trim:complete', listener)
    return () => {
      ipcRenderer.removeListener('trim:complete', listener)
    }
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
