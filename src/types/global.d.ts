import type { FileItem, PresetType, ScrapeItem } from '@lib/types'

/**
 * Kontrak jembatan IPC (window.api) antara renderer React dan backend Node.js.
 * Dipasang oleh preload script melalui contextBridge.
 */
declare global {
  interface Window {
    api?: {
      checkEngine: () => void
      onEngineStatus: (cb: (status: string) => void) => () => void
      onAppReady: (cb: (isReady: boolean) => void) => () => void
      startProcessing: (payload: { files: FileItem[]; preset: PresetType }) => void
      onProcessingProgress: (
        cb: (data: {
          id: string
          percent: number
          status: 'processing' | 'success' | 'failed'
          error?: string
        }) => void
      ) => () => void
      onProcessingComplete: (cb: (data: { outputFolder: string }) => void) => () => void
      openFolder: (folderPath: string) => void
      startDownloadBatch: (urls: string[]) => void
      onDownloadProgress: (
        cb: (data: {
          id: string
          url: string
          percent: number
          status: 'downloading' | 'success' | 'failed'
          error?: string
        }) => void
      ) => () => void
      onDownloadComplete: (cb: (data: { total: number; success: number; failed: number }) => void) => () => void
      /** Mengambil daftar video dari satu akun/halaman. */
      scrapeAccount: (payload: { id: string; url: string }) => void
      onScrapeComplete: (
        cb: (data: { id: string; items: ScrapeItem[]; truncated?: boolean; error?: string }) => void
      ) => () => void

      // --- Ekstensi (tidak mengubah kontrak inti) ---
      /** Mendapatkan jalur absolut file yang di-drop (via webUtils di preload). */
      getPathForFile: (file: File) => string
      /** Memotong video secara lossless. */

      /** Statistik sistem nyata (CPU & RAM) dari proses utama. */
      onSystemStats: (
        cb: (data: { cpu: number; ramUsedMb: number; ramTotalMb: number }) => void
      ) => () => void
      trimVideo: (payload: { id: string; path: string; start: string; end: string }) => void
      onTrimComplete: (
        cb: (data: { id: string; success: boolean; path?: string; error?: string }) => void
      ) => () => void
    }
  }
}

export {}
