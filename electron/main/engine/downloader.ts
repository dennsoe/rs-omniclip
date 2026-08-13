import path from 'node:path'
import fs from 'node:fs'
import { execFile, spawn } from 'node:child_process'
import { getEngineBinDir, getDownloadDir } from './paths'
import { downloadFile } from './net'

export interface DownloadProgress {
  id: string
  url: string
  percent: number
  status: 'downloading' | 'success' | 'failed'
}

/** URL rilis resmi yt-dlp untuk macOS (universal binary). */
const YTDLP_DOWNLOAD_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'

let ytdlpPromise: Promise<string | null> | null = null

/**
 * Memastikan binary yt-dlp tersedia (single-flight).
 * Prioritas: folder binary lokal -> perintah sistem -> unduh dari GitHub.
 */
export function ensureYtdlp(onStatus?: (message: string) => void): Promise<string | null> {
  if (!ytdlpPromise) {
    ytdlpPromise = doEnsureYtdlp(onStatus)
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

/**
 * Memulai unduhan video dari URL (YouTube, TikTok, Instagram, dll).
 * `payload.id` (opsional) dipakai agar id di renderer cocok dengan event kemajuan.
 */
export async function startDownload(
  payload: { url: string; id?: string },
  onProgress: (p: DownloadProgress) => void
): Promise<void> {
  const url = (payload.url ?? '').trim()
  const id = payload.id ?? generateId()

  if (!url) {
    onProgress({ id, url, percent: 0, status: 'failed' })
    return
  }

  try {
    const ytdlp = await ensureYtdlp()
    if (!ytdlp) {
      onProgress({ id, url, percent: 0, status: 'failed' })
      return
    }

    const outDir = getDownloadDir()
    await fs.promises.mkdir(outDir, { recursive: true })
    const outputTemplate = path.join(outDir, '%(title).80B [%(id)s].%(ext)s')
    const args = ['--newline', '--no-playlist', '--progress', '-o', outputTemplate, url]

    const proc = spawn(ytdlp, args)

    proc.stdout.on('data', (chunk: Buffer) => {
      const percent = extractPercent(chunk.toString())
      if (percent !== null) {
        onProgress({ id, url, percent, status: 'downloading' })
      }
    })

    proc.stderr.on('data', () => {
      // Pesan error/diagnostik yt-dlp, tidak ditampilkan langsung.
    })

    proc.on('error', () => {
      onProgress({ id, url, percent: 0, status: 'failed' })
    })

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress({ id, url, percent: 100, status: 'success' })
      } else {
        onProgress({ id, url, percent: 0, status: 'failed' })
      }
    })
  } catch {
    onProgress({ id, url, percent: 0, status: 'failed' })
  }
}

function extractPercent(line: string): number | null {
  const match = /\[download\]\s+(\d+(?:\.\d+)?)%/.exec(line)
  if (!match) return null
  return Math.min(100, Number.parseFloat(match[1]))
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
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
