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
  speedBytesPerSec?: number
  etaSeconds?: number
  sizeBytes?: number
  phase?: 'extracting' | 'downloading' | 'merging' | 'retrying' | 'done'
  title?: string
  thumbnail?: string
  description?: string
  filePath?: string
  duration?: number
  uploader?: string
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

interface ProxyConfigData {
  enabled: boolean
  proxies: string[]
  rotationEvery: number
}

interface HistoryEntryData {
  url: string
  title?: string
  thumbnail?: string
  filePath: string
  platform?: string
  ts: number
}

interface AppConfigData {
  proxy: { enabled: boolean; proxies: string[]; rotationEvery: number }
  watcher: WatcherConfigData
  hwAccel: { mode: 'auto' | 'videotoolbox' | 'nvenc' | 'amf' }
  analyticsExport: boolean
  history: HistoryEntryData[]
}

interface WatcherConfigData {
  enabled: boolean
  intervalHours: number
  accounts: Array<{
    url: string
    label?: string
    lastSeenId?: string
    lastCheckedAt?: number
    lastFoundAt?: number
  }>
}

interface WatcherNotifyData {
  title: string
  body: string
}

interface AccountInfoData {
  url: string
  duplicate: boolean
  exists: boolean
  name?: string
  username?: string
  avatar?: string
  followers?: number
  bio?: string
  platform?: string
  error?: string
}

interface CampaignWorkspaceData {
  id: string
  name: string
  profileName: string
  metaCsvText: string
  shopeeCsvText: string
  shopeeClicksText: string
  settings: {
    mappingRule: 'contains' | 'exact'
    taxRate: number
    selectedStatuses: string[]
    dateStart: string
    dateEnd: string
  }
  updatedAt: string
}

interface CampaignWorkspaceSummaryData {
  id: string
  name: string
  profileName: string
  updatedAt: string
}

interface AiSettingsData {
  provider: 'gemini' | 'openai'
  geminiKey: string
  openaiKey: string
}

interface AiAnalyzePayloadData {
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
  totalMetrics: {
    totalSpend: number
    totalCommission: number
    netProfit: number
    roi: number
    totalClicks: number
    totalShopeeClicks: number
    totalOrders: number
    conversionRate: number
    averageCpc: number
    cpa: number
  }
  question?: string
  chatHistory?: Array<{ role: 'user' | 'model'; text: string }>
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

  startProcessing: (payload: {
    files: unknown[]
    preset: string
    processingMode?: string
    cleanMetadata?: boolean
    quality?: string
    audio?: string
    fps?: string
  }): void => {
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

  /** Menampilkan berkas di folder (Finder/Explorer). */
  showItemInFolder: (filePath: string): void => {
    ipcRenderer.send('folder:reveal', filePath)
  },

  startDownloadBatch: (
    urls: string[],
    options?: { maxHeight?: number; cookiesBrowser?: string; douyinCookie?: string; parallel?: boolean }
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
  scrapeAccount: (payload: { id: string; url: string; options?: { cookiesBrowser?: string } }): void => {
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

  /** Meresolusi pratinjau satu video (URL media langsung + thumbnail/durasi). */
  resolvePreview: (
    payload: { url: string; options?: { cookiesBrowser?: string } }
  ): Promise<{
    url: string
    playUrl?: string
    thumbnail?: string
    duration?: number
    title?: string
    error?: string
  }> => {
    return ipcRenderer.invoke('preview:resolve', payload)
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

  /** Memvalidasi header Cookie Douyin (diproses di main — satu sumber kebenaran). */
  validateDouyinCookie: (raw: string): Promise<{
    count: number
    invalid: number
    keys: string[]
    hasSession: boolean
  }> => {
    return ipcRenderer.invoke('douyin:validate', raw)
  },

  /** Info jembatan cookie ekstensi: port + kode hubung `<port>:<token>`. */
  getCookieBridgeInfo: (): Promise<{
    active: boolean
    port: number | null
    code: string | null
  }> => {
    return ipcRenderer.invoke('cookieBridge:info')
  },

  /** Versi ekstensi cookie (baca manifest dari dalam app). */
  getExtensionInfo: (): Promise<{ version: string | null }> => {
    return ipcRenderer.invoke('extension:info')
  },

  /** Menyiapkan ekstensi cookie: salin ZIP ber-versi ke Downloads & tampilkan
   *  file-nya di Finder (tanpa membuat folder). */
  prepareExtension: (): Promise<{
    ok: boolean
    zipPath?: string
    version?: string | null
    error?: string
  }> => {
    return ipcRenderer.invoke('extension:prepare')
  },

  /** Cookie diterima dari ekstensi MV3 (valid & lolos token). */
  onCookieReceived: (cb: (data: {
    site: string
    cookieHeader: string
    count: number
    hasSession: boolean
    supported: boolean
  }) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, data: {
      site: string
      cookieHeader: string
      count: number
      hasSession: boolean
      supported: boolean
    }): void => cb(data)
    ipcRenderer.on('cookie:received', listener)
    return () => {
      ipcRenderer.removeListener('cookie:received', listener)
    }
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
  },

  /** Status resource SEGAR dari proses utama (setelah versi terdeteksi) —
   *  basis akurat badge update di sidebar. */
  onResourceChanged: (cb: (data: ResourceInfoData[]) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, data: ResourceInfoData[]): void => cb(data)
    ipcRenderer.on('resource:changed', listener)
    return () => {
      ipcRenderer.removeListener('resource:changed', listener)
    }
  },

  // --- Konfigurasi & riwayat (main process) ---
  getConfig: (): Promise<AppConfigData> => {
    return ipcRenderer.invoke('config:get')
  },
  setConfig: (patch: Partial<AppConfigData>): Promise<AppConfigData> => {
    return ipcRenderer.invoke('config:set', patch)
  },
  listHistory: (): Promise<HistoryEntryData[]> => {
    return ipcRenderer.invoke('history:list')
  },
  clearHistory: (): Promise<boolean> => {
    return ipcRenderer.invoke('history:clear')
  },

  // --- Manajer Proxy (anti-banned) ---
  getProxyConfig: (): Promise<ProxyConfigData> => {
    return ipcRenderer.invoke('proxy:list')
  },
  saveProxyConfig: (cfg: Partial<ProxyConfigData>): Promise<ProxyConfigData> => {
    return ipcRenderer.invoke('proxy:save', cfg)
  },
  testProxy: (
    proxyUrl: string
  ): Promise<{ ok: boolean; latencyMs: number; error?: string }> => {
    return ipcRenderer.invoke('proxy:test', proxyUrl)
  },

  // --- Hardware acceleration (deteksi encoder) ---
  detectEncoders: (): Promise<Array<'videotoolbox' | 'nvenc' | 'amf'>> => {
    return ipcRenderer.invoke('hw:detect')
  },

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
  }): Promise<string> => {
    return ipcRenderer.invoke('analytics:export', payload)
  },

  // --- Auto-Watcher (pemantauan akun otomatis) ---
  getWatcherConfig: (): Promise<WatcherConfigData> => ipcRenderer.invoke('watcher:list'),
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
  }): Promise<WatcherConfigData> => ipcRenderer.invoke('watcher:add', payload),
  removeWatchedAccount: (url: string): Promise<WatcherConfigData> =>
    ipcRenderer.invoke('watcher:remove', url),
  setWatcherEnabled: (enabled: boolean): Promise<WatcherConfigData> =>
    ipcRenderer.invoke('watcher:setEnabled', enabled),
  setWatcherInterval: (hours: number): Promise<WatcherConfigData> =>
    ipcRenderer.invoke('watcher:setInterval', hours),
  checkWatcherNow: (url?: string): Promise<Array<{ url: string; newItems?: unknown[]; error?: string }>> =>
    ipcRenderer.invoke('watcher:checkNow', url),
  resolveWatchedAccount: (url: string): Promise<AccountInfoData> =>
    ipcRenderer.invoke('watcher:resolve', url),
  onWatcherNotify: (cb: (data: WatcherNotifyData) => void): Unsubscribe => {
    const listener = (_event: Electron.IpcRendererEvent, data: WatcherNotifyData): void => cb(data)
    ipcRenderer.on('watcher:notify', listener)
    return () => {
      ipcRenderer.removeListener('watcher:notify', listener)
    }
  },

  // --- Performa Kampanye: workspace (analytics) + Asisten AI ---
  listCampaignWorkspaces: (): Promise<CampaignWorkspaceSummaryData[]> => ipcRenderer.invoke('analytics:list'),
  loadCampaignWorkspace: (id: string): Promise<CampaignWorkspaceData | null> =>
    ipcRenderer.invoke('analytics:load', id),
  saveCampaignWorkspace: (payload: Partial<CampaignWorkspaceData>): Promise<{ id: string; savedAt: string }> =>
    ipcRenderer.invoke('analytics:save', payload),
  deleteCampaignWorkspace: (id: string): Promise<boolean> => ipcRenderer.invoke('analytics:delete', id),
  getAiSettings: (): Promise<AiSettingsData> => ipcRenderer.invoke('ai:getSettings'),
  setAiSettings: (patch: Partial<AiSettingsData>): Promise<AiSettingsData> => ipcRenderer.invoke('ai:setSettings', patch),
  aiAnalyze: (payload: AiAnalyzePayloadData): Promise<{ text: string }> => ipcRenderer.invoke('ai:analyze', payload)
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
