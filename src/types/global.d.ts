import type {
  FileItem,
  PresetType,
  ScrapeItem,
  UpdateInfo,
  ResourceInfo,
  DownloadOptions,
  DownloadProgress,
  ResolvedPreview,
  AppConfig,
  HistoryEntry
} from '@lib/types'

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
      /** Menampilkan berkas di folder (Finder/Explorer). */
      showItemInFolder: (filePath: string) => void
      startDownloadBatch: (urls: string[], options?: DownloadOptions) => void
      onDownloadProgress: (cb: (data: DownloadProgress) => void) => () => void
      onDownloadComplete: (cb: (data: { total: number; success: number; failed: number }) => void) => () => void
      /** Mengambil daftar video dari satu akun/halaman. */
      scrapeAccount: (payload: { id: string; url: string; options?: { cookiesBrowser?: string } }) => void
      onScrapeComplete: (
        cb: (data: { id: string; items: ScrapeItem[]; truncated?: boolean; error?: string }) => void
      ) => () => void
      /** Meresolusi pratinjau satu video (URL media langsung + thumbnail/durasi). */
      resolvePreview: (
        payload: { url: string; options?: { cookiesBrowser?: string } }
      ) => Promise<ResolvedPreview>

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

      // --- Pembaruan aplikasi & resource (gratis, repo publik) ---
      checkForUpdate: () => Promise<UpdateInfo>
      openUpdatePage: (url: string) => Promise<boolean>
      checkResources: () => Promise<ResourceInfo[]>
      updateResources: (force?: boolean) => Promise<ResourceInfo[]>
      onResourceStatus: (cb: (message: string) => void) => () => void
      /** Status resource segar dari proses utama (dipakai badge update sidebar). */
      onResourceChanged: (cb: (data: ResourceInfo[]) => void) => () => void

      // --- Konfigurasi & riwayat (main process) ---
      getConfig: () => Promise<AppConfig>
      setConfig: (patch: Partial<AppConfig>) => Promise<AppConfig>
      listHistory: () => Promise<HistoryEntry[]>
      clearHistory: () => Promise<boolean>

      // --- Manajer Proxy (anti-banned) ---
      getProxyConfig: () => Promise<AppConfig['proxy']>
      saveProxyConfig: (cfg: Partial<AppConfig['proxy']>) => Promise<AppConfig['proxy']>
      testProxy: (proxyUrl: string) => Promise<{ ok: boolean; latencyMs: number; error?: string }>

      // --- Hardware acceleration (deteksi encoder) ---
      detectEncoders: () => Promise<Array<'videotoolbox' | 'nvenc' | 'amf'>>

      // --- Ekspor data analitik (CSV) ---
      exportAnalytics: (payload: {
        items: Array<{
          id?: string
          title?: string
          url: string
          duration?: number
          views?: number
          likes?: number
          comments?: number
          description?: string
        }>
      }) => Promise<string>

      // --- Auto-Watcher (pemantauan akun otomatis) ---
      getWatcherConfig: () => Promise<AppConfig['watcher']>
      addWatchedAccount: (payload: { url: string; label?: string }) => Promise<AppConfig['watcher']>
      removeWatchedAccount: (url: string) => Promise<AppConfig['watcher']>
      setWatcherEnabled: (enabled: boolean) => Promise<AppConfig['watcher']>
      setWatcherInterval: (hours: number) => Promise<AppConfig['watcher']>
      checkWatcherNow: (
        url?: string
      ) => Promise<Array<{ url: string; newItems?: unknown[]; error?: string }>>
      onWatcherNotify: (
        cb: (data: { title: string; body: string }) => void
      ) => () => void
    }
  }
}

export {}
