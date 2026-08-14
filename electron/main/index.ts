import { app, shell, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { ensureFfmpeg } from '@engine/ffmpeg'
import {
  processBatch,
  type PresetType,
  type ProcessFileInput,
  type ProcessProgress
} from '@engine/processor'
import { trimVideo, type TrimPayload } from '@engine/trimmer'
import { startDownloadBatch, scrapeAccount, type DownloadProgress, type DownloadOptions } from '@engine/downloader'
import {
  checkForUpdate,
  getResourceStatus,
  updateResources,
  recordInstalledVersions,
  type UpdateInfo,
  type ResourceInfo
} from '@engine/updater'
import { getTrackedPids, sampleProcess } from '@engine/procmon'

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
    })
    emit('processing:complete', { outputFolder })
  } catch (err) {
    console.error('[RS OmniClip] Gagal memproses batch:', err)
    emit('processing:complete', { outputFolder: '' })
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
    parallel: payload.options?.parallel === true
  }
  void startDownloadBatch(
    urls,
    (p: DownloadProgress) => emit('download:progress', p),
    (r) => emit('download:complete', r),
    options
  )
}

function handleScrape(payload: { id?: string; url?: string }): void {
  const id = typeof payload?.id === 'string' && payload.id ? payload.id : generateScrapeId()
  const url = typeof payload?.url === 'string' ? payload.url.trim() : ''
  if (!url) {
    emit('scrape:complete', { id, items: [], error: 'URL tidak valid.' })
    return
  }
  void scrapeAccount(url)
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

  ipcMain.on('processing:start', (_event, payload) => {
    void handleProcessing(payload)
  })

  ipcMain.on('download:start', (_event, payload) => {
    handleDownload(payload)
  })

  ipcMain.on('scrape:start', (_event, payload) => {
    handleScrape(payload)
  })

  ipcMain.on('trim:start', (_event, payload) => {
    handleTrim(payload)
  })

  ipcMain.on('folder:open', (_event, folderPath: string) => {
    if (typeof folderPath === 'string' && folderPath.trim()) {
      void shell.openPath(folderPath.trim())
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

  // Catat versi resource saat aplikasi selesai menginisialisasi engine.
  void recordInstalledVersions().catch(() => {
    /* versi resource tidak wajib untuk fungsi inti */
  })
}

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
    registerIpc()
    createWindow()
    void initEngine()
    startSystemStats()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
