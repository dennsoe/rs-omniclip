import { contextBridge, ipcRenderer, webUtils } from 'electron'

type Unsubscribe = () => void

interface ProcessingProgressData {
  id: string
  percent: number
  status: 'processing' | 'success' | 'failed'
  /** Pesan kegagalan opsional (hanya saat status 'failed'). */
  error?: string
}

interface ProcessingCompleteData {
  outputFolder: string
}

interface DownloadProgressData {
  id: string
  url: string
  percent: number
  status: 'downloading' | 'success' | 'failed'
  /** Pesan kegagalan opsional (hanya saat status 'failed'). */
  error?: string
}

interface TrimCompleteData {
  id: string
  success: boolean
  path?: string
  error?: string
}

interface UpdateInfoData {
  current: string
  latest: string | null
  hasUpdate: boolean
  url: string | null
  notes: string | null
}

interface ResourceInfoData {
  id: string
  label: string
  current: string | null
  expected: string | null
  outdated: boolean
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

  startDownloadBatch: (
    urls: string[],
    options?: { maxHeight?: number; cookiesBrowser?: string; parallel?: boolean }
  ): void => {
    ipcRenderer.send('download:start', { urls, options })
  },

  onDownloadProgress: (cb: (data: DownloadProgressData) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, data: DownloadProgressData): void => cb(data)
    ipcRenderer.on('download:progress', listener)
    return () => {
      ipcRenderer.removeListener('download:progress', listener)
    }
  },

  onDownloadComplete: (cb: (data: { total: number; success: number; failed: number }) => void): Unsubscribe => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { total: number; success: number; failed: number }
    ): void => cb(data)
    ipcRenderer.on('download:complete', listener)
    return () => {
      ipcRenderer.removeListener('download:complete', listener)
    }
  },

  /** Mengambil daftar video dari satu akun/halaman (via yt-dlp flat-playlist). */
  scrapeAccount: (payload: { id: string; url: string }): void => {
    ipcRenderer.send('scrape:start', payload)
  },

  onScrapeComplete: (
    cb: (data: {
      id: string
      items: Array<{ index: number; id: string; title: string; url: string }>
      truncated?: boolean
      error?: string
    }) => void
  ): Unsubscribe => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: {
        id: string
        items: Array<{ index: number; id: string; title: string; url: string }>
        truncated?: boolean
        error?: string
      }
    ): void => cb(data)
    ipcRenderer.on('scrape:complete', listener)
    return () => {
      ipcRenderer.removeListener('scrape:complete', listener)
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
  },

  /** Statistik sistem nyata (CPU & RAM) dari proses utama. */
  onSystemStats: (cb: (data: { cpu: number; ramUsedMb: number; ramTotalMb: number }) => void): Unsubscribe => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { cpu: number; ramUsedMb: number; ramTotalMb: number }
    ): void => cb(data)
    ipcRenderer.on('system:stats', listener)
    return () => {
      ipcRenderer.removeListener('system:stats', listener)
    }
  },

  // --- Pembaruan aplikasi & resource (gratis, repo publik) ---
  /** Memeriksa versi terbaru aplikasi dari GitHub Releases (tanpa token). */
  checkForUpdate: (): Promise<UpdateInfoData> => {
    return ipcRenderer.invoke('update:check')
  },

  /** Membuka halaman rilis GitHub di browser (strategi unduh manual macOS). */
  openUpdatePage: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke('update:open', url)
  },

  /** Memeriksa status resource ffmpeg/yt-dlp terhadap manifest repo. */
  checkResources: (): Promise<ResourceInfoData[]> => {
    return ipcRenderer.invoke('resource:check')
  },

  /** Memperbarui resource yang outdated (atau semua bila force=true). */
  updateResources: (force = false): Promise<ResourceInfoData[]> => {
    return ipcRenderer.invoke('resource:update', force)
  },

  /** Status progres pembaruan resource dari proses utama. */
  onResourceStatus: (cb: (message: string) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, message: string): void => cb(message)
    ipcRenderer.on('resource:status', listener)
    return () => {
      ipcRenderer.removeListener('resource:status', listener)
    }
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
