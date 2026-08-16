import { app, shell, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { ensureFfmpeg, detectEncoders, type EncoderId } from '@engine/ffmpeg'
import {
  processBatch,
  type PresetType,
  type ProcessFileInput,
  type ProcessProgress
} from '@engine/processor'
import { trimVideo, type TrimPayload } from '@engine/trimmer'
import {
  scrapeAccount,
  resolvePreviewUrl,
  type DownloadProgress,
  type DownloadOptions
} from '@engine/downloader'
import {
  checkForUpdate,
  getResourceStatus,
  updateResources,
  recordInstalledVersions,
  type UpdateInfo,
  type ResourceInfo
} from '@engine/updater'
import { getTrackedPids, sampleProcess } from '@engine/procmon'
import { enqueueBatch } from '@engine/queue'
import { testProxy, resetRotation } from '@engine/proxy'
import { registerMediaScheme, registerMediaProtocol } from './media'
import { getConfig, setConfig, appendHistory, clearHistory } from './config'
import { exportScrapeToCsv } from '@engine/analytics'
import {
  startWatcher,
  stopWatcher,
  checkAccountOnce,
  setWatcherNotify,
  resolveAccount
} from '@engine/watcher'
import {
  listWorkspaces,
  loadWorkspace,
  saveWorkspace,
  deleteWorkspace,
  getGeminiApiKey,
  setGeminiApiKey,
  analyzeWithGemini,
  type AiAnalyzePayload
} from '@engine/campaign'

let mainWindow: BrowserWindow | null = null
let engineReady = false
let engineInitializing: Promise<void> | null = null

// --- Statistik aplikasi (System Monitor): pemakaian CPU & RAM aplikasi ini ---
// Mencakup proses Electron (main/renderer/GPU) + pekerja anak (FFmpeg/yt-dlp),
// diukur dari data nyata OS (`ps`) agar realtime dan mencerminkan pemrosesan.
let statsTimer: NodeJS.Timeout | null = null
let statsInFlight = false
let prevCpuSamples = new Map<number, number>() // pid -> waktu CPU kumulatif (ms)
let prevSampleTime = 0

/** Kumpulkan PID aplikasi (Electron) + PID pekerja (FFmpeg/yt-dlp). */
function collectProcessPids(): number[] {
  const pids = new Set<number>()
  for (const metric of app.getAppMetrics()) {
    if (metric.pid > 0) pids.add(metric.pid)
  }
  for (const pid of getTrackedPids()) pids.add(pid)
  return [...pids]
}

/**
 * CPU (%) yang dipakai aplikasi ini, dihitung dari selisih waktu CPU
 * kumulatif setiap proses antar sampel (realtime, bukan rata-rata seumur hidup).
 */
async function computeAppCpuPercent(nowMs: number): Promise<number> {
  const pids = collectProcessPids()
  const current = new Map<number, number>()
  await Promise.all(
    pids.map(async (pid) => {
      const sample = await sampleProcess(pid)
      if (sample) current.set(pid, sample.cpuTimeMs)
    })
  )

  const elapsedSec = (nowMs - prevSampleTime) / 1000
  let total = 0
  if (prevSampleTime > 0 && elapsedSec > 0) {
    for (const [pid, cpuMs] of current) {
      const prev = prevCpuSamples.get(pid)
      if (prev !== undefined) {
        const diffMs = Math.max(0, cpuMs - prev)
        total += (diffMs / 1000 / elapsedSec) * 100
      }
    }
  }
  prevCpuSamples = current
  prevSampleTime = nowMs
  return Math.min(100, Math.max(0, Math.round(total)))
}

/** RAM (MB) yang dipakai aplikasi ini (jumlah RSS seluruh proses). */
async function computeAppRamUsedMb(): Promise<number> {
  const pids = collectProcessPids()
  const samples = await Promise.all(pids.map((pid) => sampleProcess(pid)))
  let totalBytes = 0
  for (const s of samples) if (s) totalBytes += s.rssBytes
  return Math.round(totalBytes / 1024 / 1024)
}

function startSystemStats(): void {
  if (statsTimer) return
  statsTimer = setInterval(async () => {
    if (statsInFlight) return
    statsInFlight = true
    try {
      const now = Date.now()
      const [cpu, ramUsedMb] = await Promise.all([
        computeAppCpuPercent(now),
        computeAppRamUsedMb()
      ])
      emit('system:stats', {
        cpu,
        ramUsedMb,
        ramTotalMb: Math.round(os.totalmem() / 1024 / 1024)
      })
    } finally {
      statsInFlight = false
    }
  }, 1500)
}

function emit(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

function emitEngineStatus(message: string): void {
  emit('engine:status', message)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 720,
    minHeight: 560,
    show: false,
    title: 'RS OmniClip',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url.startsWith('https://') || details.url.startsWith('http://')) {
      void shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void mainWindow.loadURL(devUrl)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Menginisialisasi mesin backend (single-flight). Event `engine:status`
 * dan `app:ready` dikirim ke renderer.
 */
async function initEngine(): Promise<void> {
  if (engineReady) {
    emitEngineStatus('Mesin siap digunakan.')
    emit('app:ready', true)
    return
  }
  if (engineInitializing) {
    return engineInitializing
  }

  engineInitializing = (async () => {
    emitEngineStatus('Memeriksa dan menyiapkan mesin FFmpeg...')
    try {
      await ensureFfmpeg((message) => emitEngineStatus(message))
      engineReady = true
      emitEngineStatus('Mesin siap digunakan.')
      emit('app:ready', true)
    } catch (err) {
      console.error('[RS OmniClip] Gagal menginisialisasi engine:', err)
      emitEngineStatus('Gagal menginisialisasi mesin FFmpeg. Periksa koneksi internet lalu coba lagi.')
      emit('app:ready', false)
    } finally {
      engineInitializing = null
    }
  })()

  return engineInitializing
}

async function handleProcessing(payload: {
  files: ProcessFileInput[]
  preset: PresetType
  processingMode?: 'privacy' | 'enhance'
  cleanMetadata?: boolean
  quality?: 'auto' | 'best' | 'balanced' | 'compact'
  audio?: 'original' | 'aac128' | 'aac192' | 'aac256'
}): Promise<void> {
  if (
    !payload ||
    !Array.isArray(payload.files) ||
    payload.files.length === 0
  ) {
    return
  }

  // Saring file dengan jalur valid agar engine tidak menerima data cacat.
  const validFiles = payload.files.filter(
    (f) => f && typeof f.path === 'string' && f.path.trim() !== ''
  )
  if (validFiles.length === 0) {
    emit('processing:complete', { outputFolder: '' })
    return
  }

  try {
    const outputFolder = await processBatch(validFiles, payload.preset, (p: ProcessProgress) => {
      emit('processing:progress', p)
    }, {
      hwAccel: getConfig().hwAccel?.mode ?? 'auto',
      processingMode: payload.processingMode ?? 'enhance',
      cleanMetadata: payload.cleanMetadata !== false,
      quality: payload.quality ?? 'auto',
      audio: payload.audio ?? 'original'
    })
    emit('processing:complete', { outputFolder })
  } catch (err) {
    console.error('[RS OmniClip] Gagal memproses batch:', err)
    emit('processing:complete', { outputFolder: '' })
  }
}

/** Tebak platform dari hostname URL (utk riwayat & CSV analytics). */
function guessPlatform(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    if (host.endsWith('tiktok.com') || host.endsWith('tiktokv.com')) return 'TikTok'
    if (host.endsWith('instagram.com') || host.endsWith('instagr.am')) return 'Instagram'
    if (host.endsWith('youtube.com') || host.endsWith('youtu.be')) return 'YouTube'
    if (host.endsWith('facebook.com') || host.endsWith('fb.watch')) return 'Facebook'
    if (host.endsWith('douyin.com')) return 'Douyin'
    if (host.endsWith('twitter.com') || host.endsWith('x.com')) return 'X'
    return host.split('.')[0] || 'Lainnya'
  } catch {
    return 'Lainnya'
  }
}

function handleDownload(payload: { urls?: string[]; options?: DownloadOptions }): void {
  if (!payload || !Array.isArray(payload.urls)) {
    return
  }
  const urls = payload.urls
    .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
    .map((u) => u.trim())
  if (urls.length === 0) {
    return
  }
  const options: DownloadOptions = {
    maxHeight:
      typeof payload.options?.maxHeight === 'number' && payload.options.maxHeight > 0
        ? Math.round(payload.options.maxHeight)
        : undefined,
    cookiesBrowser:
      typeof payload.options?.cookiesBrowser === 'string' && payload.options.cookiesBrowser.trim()
        ? payload.options.cookiesBrowser.trim()
        : undefined,
    douyinCookie:
      typeof payload.options?.douyinCookie === 'string' && payload.options.douyinCookie.trim()
        ? payload.options.douyinCookie.trim()
        : undefined,
    parallel: payload.options?.parallel === true
  }
  // Route lewat antrean terpusat agar tidak bentrok dengan unduhan lain
  // (mis. Auto-Watcher) — perilaku sama utk batch tunggal.
  enqueueBatch({
    urls,
    options,
    onProgress: (p: DownloadProgress) => {
      // Catat riwayat saat unduhan berhasil (dipakai tab Riwayat).
      if (p.status === 'success' && p.filePath) {
        appendHistory({
          url: p.url,
          title: p.title,
          thumbnail: p.thumbnail,
          filePath: p.filePath,
          platform: guessPlatform(p.url),
          ts: Date.now()
        })
      }
      emit('download:progress', p)
    },
    onComplete: (r) => emit('download:complete', r)
  })
}

function handleScrape(payload: { id?: string; url?: string; options?: DownloadOptions }): void {
  const id = typeof payload?.id === 'string' && payload.id ? payload.id : generateScrapeId()
  const url = typeof payload?.url === 'string' ? payload.url.trim() : ''
  if (!url) {
    emit('scrape:complete', { id, items: [], error: 'URL tidak valid.' })
    return
  }
  const options: DownloadOptions = {
    cookiesBrowser:
      typeof payload.options?.cookiesBrowser === 'string' && payload.options.cookiesBrowser.trim()
        ? payload.options.cookiesBrowser.trim()
        : undefined
  }
  void scrapeAccount(url, options)
    .then((result) => emit('scrape:complete', { id, items: result.items, truncated: result.truncated }))
    .catch((err) =>
      emit('scrape:complete', {
        id,
        items: [],
        error: err instanceof Error ? err.message : 'Gagal mengambil daftar video.'
      })
    )
}

function generateScrapeId(): string {
  return `scrape-${Date.now().toString(36)}`
}

/**
 * Meresolusi pratinjau satu video (URL media langsung + thumbnail/durasi).
 * Request-response via ipcMain.handle + ipcRenderer.invoke.
 */
async function handleResolvePreview(payload: {
  url?: string
  options?: DownloadOptions
}): Promise<import('@engine/downloader').ResolvedPreview> {
  const url = typeof payload?.url === 'string' ? payload.url.trim() : ''
  if (!url) return { url, error: 'URL tidak valid.' }
  const options: DownloadOptions = {
    cookiesBrowser:
      typeof payload.options?.cookiesBrowser === 'string' && payload.options.cookiesBrowser.trim()
        ? payload.options.cookiesBrowser.trim()
        : undefined
  }
  try {
    return await resolvePreviewUrl(url, options)
  } catch (err) {
    return {
      url,
      error: err instanceof Error ? err.message : 'Gagal memuat pratinjau video.'
    }
  }
}

function handleTrim(payload: TrimPayload): void {
  if (
    !payload ||
    typeof payload.id !== 'string' ||
    typeof payload.path !== 'string' ||
    typeof payload.start !== 'string' ||
    typeof payload.end !== 'string'
  ) {
    return
  }
  void trimVideo(payload).then((data) => emit('trim:complete', data))
}

function registerIpc(): void {
  ipcMain.on('engine:check', () => {
    void initEngine()
  })

  // --- Konfigurasi main process (proxy, watcher, riwayat, dll) ---
  ipcMain.handle('config:get', () => getConfig())
  ipcMain.handle('config:set', (_event, patch) => {
    const next = setConfig(patch)
    // Perubahan watcher (enabled/interval/accounts) → restart interval.
    startWatcher()
    return next
  })

  // --- Riwayat unduhan ---
  ipcMain.handle('history:list', () => getConfig().history ?? [])
  ipcMain.handle('history:clear', () => {
    clearHistory()
    return true
  })

  // --- Manajer Proxy (anti-banned) ---
  ipcMain.handle('proxy:list', () => getConfig().proxy)
  ipcMain.handle('proxy:save', (_event, payload) => {
    const next = setConfig({
      proxy: {
        enabled: payload?.enabled === true,
        proxies: Array.isArray(payload?.proxies)
          ? payload.proxies.filter((p: unknown): p is string => typeof p === 'string')
          : [],
        rotationEvery: Math.max(1, Math.round(Number(payload?.rotationEvery) || 5))
      }
    })
    resetRotation()
    return next.proxy
  })
  ipcMain.handle('proxy:test', async (_event, proxyUrl: string) => {
    if (typeof proxyUrl !== 'string' || !proxyUrl.trim()) {
      return { ok: false, latencyMs: 0, error: 'URL proxy kosong.' }
    }
    return testProxy(proxyUrl.trim())
  })

  // --- Hardware acceleration (deteksi encoder tersedia) ---
  ipcMain.handle('hw:detect', async (): Promise<EncoderId[]> => detectEncoders())

  // --- Ekspor data analitik (CSV) hasil scrape ---
  ipcMain.handle('analytics:export', (_event, payload) => {
    const items = Array.isArray(payload?.items) ? payload.items : []
    return exportScrapeToCsv(
      items.map(
        (it: {
          id?: string
          title?: string
          url?: string
          duration?: number
          views?: number
          likes?: number
          comments?: number
          description?: string
        }) => ({
          id: it.id,
          title: it.title,
          url: it.url ?? '',
          duration: it.duration,
          views: it.views,
          likes: it.likes,
          comments: it.comments,
          description: it.description
        })
      ),
      guessPlatform
    )
  })

  // --- Auto-Watcher (pemantauan akun otomatis) ---
  ipcMain.handle('watcher:list', () => getConfig().watcher)
  ipcMain.handle('watcher:add', (_event, payload) => {
    const url = typeof payload?.url === 'string' ? payload.url.trim() : ''
    if (!url) return getConfig().watcher
    const label = typeof payload?.label === 'string' ? payload.label.trim() : ''
    const p = payload?.profile
    const accounts = [...getConfig().watcher.accounts]
    if (!accounts.some((a) => a.url === url)) {
      accounts.push({
        url,
        label: label || undefined,
        name: typeof p?.name === 'string' ? p.name : undefined,
        username: typeof p?.username === 'string' ? p.username : undefined,
        avatar: typeof p?.avatar === 'string' ? p.avatar : undefined,
        followers: typeof p?.followers === 'number' ? p.followers : undefined,
        bio: typeof p?.bio === 'string' ? p.bio : undefined,
        platform: typeof p?.platform === 'string' ? p.platform : undefined
      })
    }
    setConfig({ watcher: { accounts } })
    startWatcher()
    return getConfig().watcher
  })
  ipcMain.handle('watcher:resolve', (_event, url) => {
    const u = typeof url === 'string' ? url.trim() : ''
    return resolveAccount(u)
  })
  ipcMain.handle('watcher:remove', (_event, url: string) => {
    const accounts = getConfig().watcher.accounts.filter((a) => a.url !== url)
    setConfig({ watcher: { accounts } })
    startWatcher()
    return getConfig().watcher
  })
  ipcMain.handle('watcher:setEnabled', (_event, enabled: boolean) => {
    setConfig({ watcher: { enabled: enabled === true } })
    startWatcher()
    return getConfig().watcher
  })
  ipcMain.handle('watcher:setInterval', (_event, hours: number) => {
    const h = Math.max(0.1, Math.round((Number(hours) || 1) * 10) / 10)
    setConfig({ watcher: { intervalHours: h } })
    startWatcher()
    return getConfig().watcher
  })
  ipcMain.handle('watcher:checkNow', async (_event, url?: string) => {
    const accounts = url
      ? getConfig().watcher.accounts.filter((a) => a.url === url)
      : getConfig().watcher.accounts
    const results: Array<
      | { url: string; newItems: import('@engine/downloader').ScrapeItem[] }
      | { url: string; error: string }
    > = []
    for (const acc of accounts) {
      const res = await checkAccountOnce(acc).catch((err) => ({
        error: err instanceof Error ? err.message : 'Gagal memeriksa akun.'
      }))
      results.push({ url: acc.url, ...res })
    }
    return results
  })

  // --- Performa Kampanye: workspace (analytics) + AI ---
  ipcMain.handle('analytics:list', () => listWorkspaces())
  ipcMain.handle('analytics:load', (_event, id: string) => {
    if (typeof id !== 'string') return null
    return loadWorkspace(id)
  })
  ipcMain.handle('analytics:save', (_event, payload) => saveWorkspace(payload ?? {}))
  ipcMain.handle('analytics:delete', (_event, id: string) => {
    if (typeof id !== 'string') return false
    return deleteWorkspace(id)
  })
  ipcMain.handle('ai:getKey', () => getGeminiApiKey())
  ipcMain.handle('ai:setKey', (_event, key: string) => setGeminiApiKey(typeof key === 'string' ? key : ''))
  ipcMain.handle('ai:analyze', async (_event, payload: AiAnalyzePayload) => {
    return analyzeWithGemini(payload ?? {})
  })

  ipcMain.on('processing:start', (_event, payload) => {
    void handleProcessing(payload)
  })

  ipcMain.on('download:start', (_event, payload) => {
    handleDownload(payload)
  })

  ipcMain.on('scrape:start', (_event, payload) => {
    handleScrape(payload)
  })

  ipcMain.handle('preview:resolve', (_event, payload) => handleResolvePreview(payload))

  ipcMain.on('trim:start', (_event, payload) => {
    handleTrim(payload)
  })

  ipcMain.on('folder:open', (_event, folderPath: string) => {
    if (typeof folderPath === 'string' && folderPath.trim()) {
      void shell.openPath(folderPath.trim())
    }
  })

  ipcMain.on('folder:reveal', (_event, filePath: string) => {
    if (typeof filePath === 'string' && filePath.trim()) {
      shell.showItemInFolder(filePath.trim())
    }
  })

  // --- Pembaruan aplikasi & resource (gratis, repo publik) ---
  ipcMain.handle('update:check', (): Promise<UpdateInfo> => checkForUpdate())

  ipcMain.handle('update:open', async (_event, url: string) => {
    // Strategi macOS: buka halaman rilis GitHub — user mengunduh & membuka
    // dmg/zip secara manual (100% gratis, tanpa Developer ID / notarisasi).
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      await shell.openExternal(url)
    }
    return true
  })

  ipcMain.handle('resource:check', (): Promise<ResourceInfo[]> => getResourceStatus())

  ipcMain.handle('resource:update', async (_event, force = false) => {
    const onStatus = (message: string) => {
      mainWindow?.webContents.send('resource:status', message)
    }
    return updateResources(onStatus, force === true)
  })

  // Catat versi resource saat aplikasi selesai menginisialisasi engine, lalu
  // kirim status resource SEGAR ke renderer — basis akurat badge update di
  // sidebar (menghindari badge palsu saat versions.json belum terisi di mount,
  // karena deteksi yt-dlp butuh ~11 detik boot).
  void recordInstalledVersions()
    .then(async () => {
      const fresh = await getResourceStatus()
      mainWindow?.webContents.send('resource:changed', fresh)
    })
    .catch(() => {
      /* versi resource tidak wajib untuk fungsi inti */
    })
}

// Skema kustom media:// (streaming file lokal utk pratinjau) — WAJIB sebelum app ready.
registerMediaScheme()

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    registerMediaProtocol()
    registerIpc()
    createWindow()
    void initEngine()
    startSystemStats()

    // Auto-Watcher: notifikasi → renderer (toast) + mulai interval bila aktif.
    setWatcherNotify((e) => emit('watcher:notify', e))
    startWatcher()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    stopWatcher()
  })
}
