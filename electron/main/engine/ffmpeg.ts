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

/** Apple Silicon (arm64) — butuh build native arm64, bukan x86_64. */
function isAppleSilicon(): boolean {
  return process.platform === 'darwin' && process.arch === 'arm64'
}

/**
 * Versi FFmpeg yang diharapkan, disesuaikan platform & arsitektur:
 * - macOS Apple Silicon : 9.0 (build native arm64 dari osxexperts.net —
 *   ffbinaries hanya menyediakan build macOS x86_64 "osx-64" yang memicu
 *   EBADARCH / errno -86 di Apple Silicon tanpa Rosetta).
 * - lainnya (Intel macOS, Windows, Linux) : 6.1 (ffbinaries / ffbinaries-prebuilt).
 */
export function expectedFfmpegVersion(): string {
  return isAppleSilicon() ? '9.0' : '6.1'
}

/**
 * Menjalankan binary sekali dan mengembalikan versi dari baris pertama
 * (null bila tidak dapat dijalankan). Verifikasi NYATA ini penting: binary
 * ber-arsitektur salah (mis. x86_64 di Apple Silicon tanpa Rosetta) gagal
 * di-spawn dengan EBADARCH — errno 86 "spawn Unknown system error -86".
 * Sebelumnya hanya `isExecutable` (cek bit X_OK) yang tidak menangkap ini.
 */
function readBinaryVersion(binPath: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let stdout = ''
    let settled = false
    const done = (value: string | null): void => {
      if (!settled) {
        settled = true
        resolve(value)
      }
    }
    const proc = spawn(binPath, args, { timeout: 15_000 })
    proc.stdout.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    proc.on('error', () => done(null))
    proc.on('close', (code) => {
      if (code !== 0) return done(null)
      const firstLine = stdout.split('\n')[0] ?? ''
      const m = firstLine.match(/(\d+\.\d+(?:\.\d+)?[^\s]*)/)
      done(m ? m[1] : firstLine.trim() || null)
    })
  })
}

async function doEnsureFfmpeg(onStatus?: (message: string) => void): Promise<FfmpegBinaries> {
  const binDir = getEngineBinDir()
  await fs.promises.mkdir(binDir, { recursive: true })
  const platform = ffbinaries.detectPlatform()
  const ffmpeg = path.join(binDir, ffbinaries.getBinaryFilename('ffmpeg', platform))
  const ffprobe = path.join(binDir, ffbinaries.getBinaryFilename('ffprobe', platform))
  const arm64 = isAppleSilicon()
  const expected = expectedFfmpegVersion()

  // Verifikasi binary yang ADA benar-benar BISA DIJALANKAN (bukan sekadar ada
  // & executable). Binary arsitektur salah menghasilkan EBADARCH (errno -86).
  const [curFf, curFp] = await Promise.all([
    readBinaryVersion(ffmpeg, ['-version']),
    readBinaryVersion(ffprobe, ['-version'])
  ])
  if (curFf && curFp) {
    // Apple Silicon: pastikan NATIVE arm64 dengan versi yang diharapkan (bukan
    // x86_64 via Rosetta) — agar tidak bergantung Rosetta & konsisten dgn status.
    if (!arm64 || (curFf.startsWith(expected) && curFp.startsWith(expected))) {
      onStatus?.('FFmpeg sudah tersedia.')
      return { ffmpeg, ffprobe }
    }
  }

  // Binary lama tidak valid (arsitektur salah / korup / versi tidak sesuai) →
  // bersihkan agar diunduh ulang dengan arsitektur yang benar.
  await fs.promises.rm(ffmpeg, { force: true })
  await fs.promises.rm(ffprobe, { force: true })

  if (arm64) {
    onStatus?.('Mengunduh binary FFmpeg (Apple Silicon) — butuh koneksi internet...')
    await downloadOsxExpertsArm64(binDir)
  } else {
    onStatus?.('Mengunduh binary FFmpeg untuk pertama kali (butuh koneksi internet)...')
    try {
      await downloadFfbinaries(binDir)
    } catch {
      // API ffbinaries.com tidak terjangkau - akan diverifikasi di bawah.
      onStatus?.('Sumber ffbinaries tidak terjangkau; menyiapkan sumber cadangan...')
    }

    // Verifikasi hasil unduhan (ffbinaries kadang menyelesaikan tanpa mengekstrak).
    const [okFfmpeg, okFfprobe] = await Promise.all([
      readBinaryVersion(ffmpeg, ['-version']),
      readBinaryVersion(ffprobe, ['-version'])
    ])
    if (!okFfmpeg || !okFfprobe) {
      onStatus?.('Mengunduh binary FFmpeg dari sumber cadangan...')
      await downloadFfmpegFallback(binDir)
    }
  }

  // Verifikasi akhir: binary harus benar-benar bisa dijalankan pada perangkat ini.
  const [finalFf, finalFp] = await Promise.all([
    readBinaryVersion(ffmpeg, ['-version']),
    readBinaryVersion(ffprobe, ['-version'])
  ])
  if (!finalFf || !finalFp) {
    throw new Error(
      'Binary FFmpeg tidak dapat dijalankan pada perangkat ini (arsitektur tidak kompatibel). ' +
        'Periksa koneksi internet lalu coba lagi.'
    )
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
 * Sumber cadangan: mengunduh build resmi dari rilis GitHub
 * ffbinaries/ffbinaries-prebuilt (macOS dari evermeet.cx, Windows/Linux
 * dari build resmi ffmpeg) tanpa bergantung pada API ffbinaries.com.
 * Setiap zip berisi satu binary (ffmpeg / ffprobe) di akar arsip.
 * Nama arsip & binary menyesuaikan platform (Windows memakai .exe).
 */
async function downloadFfmpegFallback(binDir: string): Promise<void> {
  const releaseBase = 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1'
  // Tag arsip ffbinaries-prebuilt: macos-64, win-64, linux-64.
  const platformTag =
    process.platform === 'win32' ? 'win-64' : process.platform === 'darwin' ? 'macos-64' : 'linux-64'
  const ext = process.platform === 'win32' ? '.exe' : ''
  const components = [
    { name: `ffmpeg${ext}`, url: `${releaseBase}/ffmpeg-6.1-${platformTag}.zip` },
    { name: `ffprobe${ext}`, url: `${releaseBase}/ffprobe-6.1-${platformTag}.zip` }
  ]

  for (const comp of components) {
    const zipPath = path.join(binDir, `${comp.name}-6.1-${platformTag}.zip`)
    const extractDir = path.join(binDir, `.ffb-tmp-${comp.name}`)
    try {
      await downloadFile(comp.url, zipPath, FFMPEG_DOWNLOAD_TIMEOUT_MS)
      await fs.promises.mkdir(extractDir, { recursive: true })
      await extract(zipPath, { dir: extractDir })
      await fs.promises.rename(path.join(extractDir, comp.name), path.join(binDir, comp.name))
      // `chmod` hanya relevan di Unix; di Windows tidak diperlukan.
      if (process.platform !== 'win32') {
        await fs.promises.chmod(path.join(binDir, comp.name), 0o755)
      }
    } finally {
      await fs.promises.rm(zipPath, { force: true })
      await fs.promises.rm(extractDir, { recursive: true, force: true })
    }
  }
}

/**
 * Sumber khusus Apple Silicon: build native arm64 dari osxexperts.net
 * (ffmpeg/ffprobe 9.0 — terverifikasi berjalan tanpa Rosetta & memuat seluruh
 * filter yang dipakai preset: unsharp, afftdn, drawtext, scale + libx264/aac).
 * ffbinaries hanya menyediakan build macOS x86_64 (osx-64) — penyebab
 * EBADARCH / errno -86 ("spawn Unknown system error -86") di Apple Silicon
 * tanpa Rosetta.
 */
async function downloadOsxExpertsArm64(binDir: string): Promise<void> {
  const base = 'https://www.osxexperts.net/'
  const components = [
    { name: 'ffmpeg', url: `${base}ffmpeg9arm.zip` },
    { name: 'ffprobe', url: `${base}ffprobe9arm.zip` }
  ]

  for (const comp of components) {
    const zipPath = path.join(binDir, `${comp.name}-9.0-arm64.zip`)
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
