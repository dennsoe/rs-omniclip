import path from 'node:path'
import fs from 'node:fs'
import { execFile, spawn } from 'node:child_process'
import { getEngineBinDir, getDownloadDir } from './paths'
import { downloadFile } from './net'
import { trackProcess, untrackProcess } from './procmon'

export interface DownloadProgress {
  id: string
  url: string
  percent: number
  status: 'downloading' | 'success' | 'failed'
  /** Pesan kegagalan opsional (diisi hanya saat status 'failed'). */
  error?: string
}

/** URL rilis resmi yt-dlp untuk macOS (universal binary). */
const YTDLP_DOWNLOAD_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'

let ytdlpPromise: Promise<string | null> | null = null

/**
 * Memastikan binary yt-dlp tersedia (single-flight).
 * Prioritas: folder binary lokal -> perintah sistem -> unduh dari GitHub.
 * Hasil gagal (null) tidak di-cache agar unduhan dapat dicoba ulang.
 */
export function ensureYtdlp(onStatus?: (message: string) => void): Promise<string | null> {
  if (!ytdlpPromise) {
    ytdlpPromise = doEnsureYtdlp(onStatus)
      .then((binPath) => {
        // Jangan simpan hasil gagal (null): izinkan unduhan ulang nanti.
        if (!binPath) {
          ytdlpPromise = null
        }
        return binPath
      })
      .catch((err) => {
        // Sama seperti ensureFfmpeg: jangan simpan promise yang reject,
        // agar inisialisasi ulang dapat mencoba lagi tanpa restart.
        ytdlpPromise = null
        throw err
      })
  }
  return ytdlpPromise
}

async function doEnsureYtdlp(onStatus?: (message: string) => void): Promise<string | null> {
  const binDir = getEngineBinDir()
  await fs.promises.mkdir(binDir, { recursive: true })

  const localPath = path.join(binDir, 'yt-dlp')
  if (await isFile(localPath)) {
    return localPath
  }

  const systemPath = await findSystemCommand('yt-dlp')
  if (systemPath) {
    onStatus?.('Menggunakan yt-dlp dari sistem.')
    return systemPath
  }

  onStatus?.('Mengunduh yt-dlp untuk pertama kali (butuh koneksi internet)...')
  try {
    await downloadFile(YTDLP_DOWNLOAD_URL, localPath)
    await fs.promises.chmod(localPath, 0o755)
    onStatus?.('yt-dlp siap digunakan.')
    return localPath
  } catch {
    onStatus?.('Gagal mengunduh yt-dlp. Periksa koneksi internet lalu coba lagi.')
    return null
  }
}

export interface DownloadBatchComplete {
  total: number
  success: number
  failed: number
}

export interface ScrapeItem {
  index: number
  id: string
  title: string
  url: string
}

export interface ScrapeResult {
  items: ScrapeItem[]
  truncated: boolean
}

/** Batas item hasil scrape agar UI tetap responsif untuk akun yang sangat besar. */
const MAX_SCRAPE_ITEMS = 500

/**
 * Memulai unduhan untuk BANYAK URL secara berurutan (batch).
 * Progress dilaporkan per URL (id = url); di akhir melaporkan ringkasan.
 */
export async function startDownloadBatch(
  urls: string[],
  onProgress: (p: DownloadProgress) => void,
  onComplete: (r: DownloadBatchComplete) => void
): Promise<void> {
  let success = 0
  let failed = 0
  for (const url of urls) {
    const ok = await downloadSingle(url, onProgress)
    if (ok) success++
    else failed++
  }
  onComplete({ total: urls.length, success, failed })
}

/** Mengunduh satu URL. Mengembalikan true bila berhasil. */
async function downloadSingle(url: string, onProgress: (p: DownloadProgress) => void): Promise<boolean> {
  const id = url
  try {
    const ytdlp = await ensureYtdlp()
    if (!ytdlp) {
      onProgress({
        id,
        url,
        percent: 0,
        status: 'failed',
        error: 'yt-dlp tidak tersedia. Periksa koneksi internet lalu coba lagi.'
      })
      return false
    }

    const outDir = getDownloadDir()
    await fs.promises.mkdir(outDir, { recursive: true })
    const outputTemplate = path.join(outDir, '%(title).80B [%(id)s].%(ext)s')
    const args = ['--newline', '--no-playlist', '--progress', '-o', outputTemplate, url]

    return await new Promise<boolean>((resolve) => {
      const proc = spawn(ytdlp, args)
      // Lacak PID agar System Monitor menyertakan beban CPU/RAM yt-dlp.
      trackProcess(proc.pid ?? 0)

      proc.stdout.on('data', (chunk: Buffer) => {
        const percent = extractPercent(chunk.toString())
        if (percent !== null) {
          onProgress({ id, url, percent, status: 'downloading' })
        }
      })

      let stderrTail = ''
      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        if (stderrTail.length < 4000) stderrTail += text
      })

      proc.on('error', () => {
        untrackProcess(proc.pid ?? 0)
        onProgress({ id, url, percent: 0, status: 'failed', error: 'Gagal menjalankan yt-dlp.' })
        resolve(false)
      })

      proc.on('close', (code) => {
        untrackProcess(proc.pid ?? 0)
        if (code === 0) {
          onProgress({ id, url, percent: 100, status: 'success' })
          resolve(true)
        } else {
          onProgress({ id, url, percent: 0, status: 'failed', error: lastLines(stderrTail) })
          resolve(false)
        }
      })
    })
  } catch (err) {
    onProgress({
      id,
      url,
      percent: 0,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unduhan gagal.'
    })
    return false
  }
}

/**
 * Mengambil daftar video dari satu akun/halaman (YouTube channel/@user, TikTok,
 * Instagram, dll) via `yt-dlp --flat-playlist --print` (cepat, tanpa mengunduh).
 */
export async function scrapeAccount(url: string): Promise<ScrapeResult> {
  const ytdlp = await ensureYtdlp()
  if (!ytdlp) {
    throw new Error('yt-dlp tidak tersedia. Periksa koneksi internet lalu coba lagi.')
  }

  const args = [
    '--flat-playlist',
    '--no-warnings',
    '--print',
    '%(id)s\t%(title)s\t%(webpage_url)s',
    url
  ]

  return await new Promise<ScrapeResult>((resolve, reject) => {
    const proc = spawn(ytdlp, args)
    let stdout = ''
    let stderrTail = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      if (stderrTail.length < 4000) stderrTail += text
    })
    proc.on('error', (err) => {
      reject(new Error(`Gagal menjalankan yt-dlp: ${err.message}`))
    })
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(lastLines(stderrTail)))
        return
      }
      const items: ScrapeItem[] = []
      const seen = new Set<string>()
      for (const line of stdout.split('\n')) {
        const parts = line.split('\t').map((s) => (s ?? '').trim())
        if (parts.length < 3 || !parts[0]) continue
        const entryUrl = parts[2] || url
        if (seen.has(entryUrl)) continue
        seen.add(entryUrl)
        items.push({
          index: items.length,
          id: parts[0],
          title: parts[1] || `Video ${items.length + 1}`,
          url: entryUrl
        })
        if (items.length >= MAX_SCRAPE_ITEMS) break
      }
      resolve({ items, truncated: items.length >= MAX_SCRAPE_ITEMS })
    })
  })
}

/** Mengambil beberapa baris terakhir dari teks untuk pesan error yang ringkas. */
function lastLines(text: string, count = 3): string {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return lines.slice(-count).join(' ') || 'Unduhan gagal.'
}

function extractPercent(line: string): number | null {
  const match = /\[download\]\s+(\d+(?:\.\d+)?)%/.exec(line)
  if (!match) return null
  return Math.min(100, Number.parseFloat(match[1]))
}

async function isFile(p: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(p)
    return stat.isFile()
  } catch {
    return false
  }
}

function findSystemCommand(command: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('which', [command], (err, stdout) => {
      if (err) {
        resolve(null)
        return
      }
      const found = stdout.trim()
      resolve(found ? found : null)
    })
  })
}
