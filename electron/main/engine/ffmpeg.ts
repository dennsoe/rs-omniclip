import ffbinaries from 'ffbinaries'
import extract from 'extract-zip'
import path from 'node:path'
import fs from 'node:fs'
import { execFile, spawn } from 'node:child_process'
import { getEngineBinDir } from './paths'
import { downloadFile } from './net'
import { trackProcess, untrackProcess } from './procmon'

export interface FfmpegBinaries {
  ffmpeg: string
  ffprobe: string
}

export interface ProbeResult {
  /** Durasi video dalam detik. 0 jika tidak diketahui. */
  duration: number
  width: number
  height: number
  hasVideo: boolean
  hasAudio: boolean
}

export interface RunFfmpegOptions {
  ffmpegPath: string
  args: string[]
  /** Durasi total dalam detik, digunakan untuk menghitung persentase kemajuan. */
  totalDuration?: number
  onProgress?: (percent: number) => void
}

let binariesPromise: Promise<FfmpegBinaries> | null = null

/** Mereset cache promise agar panggilan berikutnya memprovisoning ulang. */
export function resetFfmpegCache(): void {
  binariesPromise = null
}

/**
 * Memastikan binary ffmpeg + ffprobe tersedia (single-flight).
 * Mengunduh otomatis via ffbinaries saat pertama kali dijalankan.
 * Jika gagal, promise tidak di-cache sehingga percobaan berikutnya
 * dapat mencoba lagi (tidak terkunci permanen).
 */
export function ensureFfmpeg(onStatus?: (message: string) => void): Promise<FfmpegBinaries> {
  if (!binariesPromise) {
    binariesPromise = doEnsureFfmpeg(onStatus).catch((err) => {
      // Jangan simpan promise yang gagal: izinkan inisialisasi ulang.
      binariesPromise = null
      throw err
    })
  }
  return binariesPromise
}

async function doEnsureFfmpeg(onStatus?: (message: string) => void): Promise<FfmpegBinaries> {
  const binDir = getEngineBinDir()
  await fs.promises.mkdir(binDir, { recursive: true })
  const platform = ffbinaries.detectPlatform()
  const ffmpeg = path.join(binDir, ffbinaries.getBinaryFilename('ffmpeg', platform))
  const ffprobe = path.join(binDir, ffbinaries.getBinaryFilename('ffprobe', platform))

  const [hasFfmpeg, hasFfprobe] = await Promise.all([isExecutable(ffmpeg), isExecutable(ffprobe)])

  if (hasFfmpeg && hasFfprobe) {
    onStatus?.('FFmpeg sudah tersedia.')
    return { ffmpeg, ffprobe }
  }

  onStatus?.('Mengunduh binary FFmpeg untuk pertama kali (butuh koneksi internet)...')
  try {
    await downloadFfbinaries(binDir)
  } catch {
    // API ffbinaries.com tidak terjangkau - akan diverifikasi di bawah.
    onStatus?.('Sumber ffbinaries tidak terjangkau; menyiapkan sumber cadangan...')
  }

  // Verifikasi hasil unduhan (ffbinaries kadang menyelesaikan tanpa mengekstrak).
  const [okFfmpeg, okFfprobe] = await Promise.all([isExecutable(ffmpeg), isExecutable(ffprobe)])
  if (!okFfmpeg || !okFfprobe) {
    onStatus?.('Mengunduh binary FFmpeg dari sumber cadangan...')
    await downloadFfmpegFallback(binDir)
  }

  onStatus?.('FFmpeg berhasil diunduh dan siap.')
  return { ffmpeg, ffprobe }
}

function downloadFfbinaries(destination: string): Promise<void> {
  return withTimeout(
    new Promise<void>((resolve, reject) => {
      ffbinaries.downloadBinaries(['ffmpeg', 'ffprobe'], { destination }, (err: Error | null) => {
        if (err) reject(err)
        else resolve()
      })
    }),
    FFMPEG_DOWNLOAD_TIMEOUT_MS
  )
}

/** Batas waktu unduhan FFmpeg (ms). */
const FFMPEG_DOWNLOAD_TIMEOUT_MS = 90_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Unduhan melebihi batas waktu ${ms} ms.`))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

/**
 * Sumber cadangan: mengunduh build macos-64 resmi dari rilis GitHub
 * ffbinaries/ffbinaries-prebuilt (dibuat dari evermeet.cx) tanpa
 * bergantung pada API ffbinaries.com. Setiap zip berisi satu binary
 * (ffmpeg / ffprobe) di akar arsip.
 */
async function downloadFfmpegFallback(binDir: string): Promise<void> {
  const releaseBase = 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1'
  const components = [
    { name: 'ffmpeg', url: `${releaseBase}/ffmpeg-6.1-macos-64.zip` },
    { name: 'ffprobe', url: `${releaseBase}/ffprobe-6.1-macos-64.zip` }
  ]

  for (const comp of components) {
    const zipPath = path.join(binDir, `${comp.name}-6.1-macos-64.zip`)
    const extractDir = path.join(binDir, `.ffb-tmp-${comp.name}`)
    try {
      await downloadFile(comp.url, zipPath, FFMPEG_DOWNLOAD_TIMEOUT_MS)
      await fs.promises.mkdir(extractDir, { recursive: true })
      await extract(zipPath, { dir: extractDir })
      await fs.promises.rename(path.join(extractDir, comp.name), path.join(binDir, comp.name))
      await fs.promises.chmod(path.join(binDir, comp.name), 0o755)
    } finally {
      await fs.promises.rm(zipPath, { force: true })
      await fs.promises.rm(extractDir, { recursive: true, force: true })
    }
  }
}

async function isExecutable(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

/** Membaca durasi, resolusi, dan keberadaan audio/video via ffprobe. */
export function probe(filePath: string, ffprobePath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath]
    execFile(ffprobePath, args, { maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        reject(new Error(`Gagal membaca informasi video: ${err.message}`))
        return
      }
      try {
        const data = JSON.parse(stdout) as {
          format?: { duration?: string }
          streams?: Array<{
            codec_type?: string
            width?: number
            height?: number
          }>
        }
        const duration = Number.parseFloat(data?.format?.duration ?? '') || 0
        let width = 0
        let height = 0
        let hasVideo = false
        let hasAudio = false
        for (const stream of data?.streams ?? []) {
          if (stream.codec_type === 'video') {
            hasVideo = true
            if (width === 0) {
              width = stream.width ?? 0
              height = stream.height ?? 0
            }
          } else if (stream.codec_type === 'audio') {
            hasAudio = true
          }
        }
        resolve({ duration, width, height, hasVideo, hasAudio })
      } catch {
        reject(new Error('Gagal memproses informasi video.'))
      }
    })
  })
}

/**
 * Menjalankan ffmpeg dan melaporkan kemajuan berdasarkan baris `time=` di stderr.
 * Mengembalikan promise yang resolve saat keluar dengan kode 0.
 */
export function runFfmpeg(options: RunFfmpegOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(options.ffmpegPath, options.args, { stdio: ['ignore', 'ignore', 'pipe'] })
    // Lacak PID agar System Monitor menyertakan beban CPU/RAM FFmpeg.
    trackProcess(proc.pid ?? 0)
    let stderr = ''
    let lastPercent = -1

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text
      if (!options.onProgress) return
      const match = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text)
      if (match && options.totalDuration && options.totalDuration > 0) {
        const elapsed = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseFloat(match[3])
        const percent = Math.min(100, Math.round((elapsed / options.totalDuration) * 100))
        if (percent !== lastPercent) {
          lastPercent = percent
          options.onProgress(percent)
        }
      } else if (!options.totalDuration || options.totalDuration <= 0) {
        // Durasi tidak diketahui: beri progres indikatif (maks 90%) agar UI
        // tidak membeku di 0%; 100% dikirim saat proses selesai.
        const next = Math.min(90, (lastPercent < 0 ? 0 : lastPercent) + 1)
        if (next !== lastPercent) {
          lastPercent = next
          options.onProgress(next)
        }
      }
    })

    proc.on('error', (err) => {
      untrackProcess(proc.pid ?? 0)
      reject(new Error(`Gagal menjalankan ffmpeg: ${err.message}`))
    })

    proc.on('close', (code) => {
      untrackProcess(proc.pid ?? 0)
      if (code === 0) {
        options.onProgress?.(100)
        resolve()
      } else {
        const tail = stderr.trim().split('\n').slice(-4).join('\n')
        reject(new Error(`FFmpeg keluar dengan kode ${code}. ${tail}`))
      }
    })
  })
}
