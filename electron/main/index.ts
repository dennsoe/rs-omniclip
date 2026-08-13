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
import { startDownload, type DownloadProgress } from '@engine/downloader'

let mainWindow: BrowserWindow | null = null
let engineReady = false
let engineInitializing: Promise<void> | null = null

// --- Statistik sistem (System Monitor data nyata) ---
let statsTimer: NodeJS.Timeout | null = null
let lastCpuTimes: { idle: number; total: number } | null = null

function computeCpuPercent(): number {
  const cpus = os.cpus()
  let idle = 0
  let total = 0
  for (const cpu of cpus) {
    const times = cpu.times as Record<string, number>
    for (const key of Object.keys(times)) {
      total += times[key]
    }
    idle += times.idle
  }
  const now = { idle, total }
  if (!lastCpuTimes) {
    lastCpuTimes = now
    return 0
  }
  const idleDiff = now.idle - lastCpuTimes.idle
  const totalDiff = now.total - lastCpuTimes.total
  lastCpuTimes = now
  if (totalDiff <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((1 - idleDiff / totalDiff) * 100)))
}

function startSystemStats(): void {
  if (statsTimer) return
  statsTimer = setInterval(() => {
    const totalMem = os.totalmem()
    const usedMem = totalMem - os.freemem()
    emit('system:stats', {
      cpu: computeCpuPercent(),
      ramUsedMb: Math.round(usedMem / 1024 / 1024),
      ramTotalMb: Math.round(totalMem / 1024 / 1024)
    })
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

function handleDownload(payload: { url: string; id?: string }): void {
  if (!payload || typeof payload.url !== 'string') {
    return
  }
  void startDownload(payload, (p: DownloadProgress) => {
    emit('download:progress', p)
  })
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

  ipcMain.on('trim:start', (_event, payload) => {
    handleTrim(payload)
  })

  ipcMain.on('folder:open', (_event, folderPath: string) => {
    if (typeof folderPath === 'string' && folderPath.trim()) {
      void shell.openPath(folderPath.trim())
    }
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
