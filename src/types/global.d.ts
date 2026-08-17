import type {
  FileItem,
  PresetType,
  ProcessingMode,
  QualityLevel,
  AudioMode,
  FpsOption,
  ScrapeItem,
  UpdateInfo,
  ResourceInfo,
  DownloadOptions,
  DownloadProgress,
  ResolvedPreview,
  AppConfig,
  HistoryEntry,
  AccountInfo
} from '@lib/types'
import type {
  CampaignWorkspace,
  CampaignWorkspaceSummary,
  TotalMetrics
} from '@lib/campaign/types'

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
      startProcessing: (payload: {
        files: FileItem[]
        preset: PresetType
        processingMode?: ProcessingMode
        cleanMetadata?: boolean
        quality?: QualityLevel
        audio?: AudioMode
        fps?: FpsOption
      }) => void
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
        cb: (data: {
          cpu: number
          ramUsedMb: number
          ramTotalMb: number
          workers: number
          diskFreeMb: number
          diskTotalMb: number
          downloadSpeedBps: number
          netRxBps: number
          netTxBps: number
        }) => void
      ) => () => void
      trimVideo: (payload: { id: string; path: string; start: string; end: string }) => void
      onTrimComplete: (
        cb: (data: { id: string; success: boolean; path?: string; error?: string }) => void
      ) => () => void

      // --- Pembaruan aplikasi & resource (gratis, repo publik) ---
      checkForUpdate: () => Promise<UpdateInfo>
      openUpdatePage: (url: string) => Promise<boolean>
      /** Memvalidasi header Cookie Douyin (diproses di main — satu sumber kebenaran). */
      validateDouyinCookie: (raw: string) => Promise<{ count: number; invalid: number; keys: string[]; hasSession: boolean }>
      /** Info jembatan cookie ekstensi: port + kode hubung `<port>:<token>`. */
      getCookieBridgeInfo: () => Promise<{ active: boolean; port: number | null; code: string | null }>
      /** Versi ekstensi cookie (baca manifest dari dalam app). */
      getExtensionInfo: () => Promise<{ version: string | null }>
      /** Menyiapkan ekstensi cookie: ZIP ber-versi ke Downloads & tampilkan di Finder. */
      prepareExtension: () => Promise<{ ok: boolean; zipPath?: string; version?: string | null; error?: string }>
      /** Cookie diterima dari ekstensi MV3 (valid & lolos token). */
      onCookieReceived: (cb: (data: {
        site: string
        cookieHeader: string
        count: number
        hasSession: boolean
        supported: boolean
      }) => void) => () => void
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
      addWatchedAccount: (payload: {
        url: string
        label?: string
        profile?: {
          name?: string
          username?: string
          avatar?: string
          followers?: number
          bio?: string
          platform?: string
        }
      }) => Promise<AppConfig['watcher']>
      removeWatchedAccount: (url: string) => Promise<AppConfig['watcher']>
      setWatcherEnabled: (enabled: boolean) => Promise<AppConfig['watcher']>
      setWatcherInterval: (hours: number) => Promise<AppConfig['watcher']>
      checkWatcherNow: (
        url?: string
      ) => Promise<Array<{ url: string; newItems?: unknown[]; error?: string }>>
      resolveWatchedAccount: (url: string) => Promise<AccountInfo>
      onWatcherNotify: (
        cb: (data: { title: string; body: string }) => void
      ) => () => void

      // --- Performa Kampanye: workspace (analytics) + Asisten AI ---
      listCampaignWorkspaces: () => Promise<CampaignWorkspaceSummary[]>
      loadCampaignWorkspace: (id: string) => Promise<CampaignWorkspace | null>
      saveCampaignWorkspace: (
        payload: Partial<CampaignWorkspace>
      ) => Promise<{ id: string; savedAt: string }>
      deleteCampaignWorkspace: (id: string) => Promise<boolean>
      getAiSettings: () => Promise<{
        provider: 'gemini' | 'openai'
        geminiKey: string
        openaiKey: string
      }>
      setAiSettings: (patch: {
        provider?: 'gemini' | 'openai'
        geminiKey?: string
        openaiKey?: string
      }) => Promise<{ provider: 'gemini' | 'openai'; geminiKey: string; openaiKey: string }>
      aiAnalyze: (payload: {
        campaignsSummary: Array<{
          adName: string
          adNames: string[]
          matchedTag: string
          spend: number
          clicks: number
          orders: number
          commission: number
          roi: number
        }>
        totalMetrics: TotalMetrics
        question?: string
        chatHistory?: Array<{ role: 'user' | 'model'; text: string }>
      }) => Promise<{ text: string }>
    }
  }
}

export {}
