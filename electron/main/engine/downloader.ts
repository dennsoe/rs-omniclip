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
  /** Kecepatan unduh (byte/detik). */
  speedBytesPerSec?: number
  /** Estimasi sisa waktu (detik). */
  etaSeconds?: number
  /** Ukuran total (byte). */
  sizeBytes?: number
  /** Fase proses: ekstraksi, unduh, penggabungan, retry, selesai. */
  phase?: 'extracting' | 'downloading' | 'merging' | 'retrying' | 'done'
  /** Metadata dari yt-dlp (terisi saat berhasil). */
  title?: string
  thumbnail?: string
  description?: string
  filePath?: string
}

/** Opsi unduhan dari UI (kualitas, cookies browser, paralel). */
export interface DownloadOptions {
  /** Batas tinggi resolusi video (px). 0 / tanpa = kualitas terbaik (tanpa batas). */
  maxHeight?: number
  /** Browser untuk mengambil cookies (mis. 'chrome', 'edge', 'safari'). Kosong = tanpa cookies. */
  cookiesBrowser?: string
  /** Unduh beberapa URL sekaligus (maks 2) alih-alih berurutan. Default false. */
  parallel?: boolean
}

/** Nama binary yt-dlp sesuai platform (Windows memakai ekstensi .exe). */
const YTDLP_BIN_NAME = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'

/** URL rilis resmi yt-dlp sesuai platform (macOS universal / Windows .exe). */
const YTDLP_DOWNLOAD_URL =
  process.platform === 'win32'
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'

let ytdlpPromise: Promise<string | null> | null = null

/**
 * Memastikan binary yt-dlp tersedia (single-flight).
 * Prioritas: folder binary lokal -> perintah sistem -> unduh dari GitHub.
 * Hasil gagal (null) tidak di-cache agar unduhan dapat dicoba ulang.
 */
/** Mereset cache promise agar panggilan berikutnya memprovisioning ulang. */
export function resetYtdlpCache(): void {
  ytdlpPromise = null
}

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

  const localPath = path.join(binDir, YTDLP_BIN_NAME)
  if (await isFile(localPath)) {
    return localPath
  }

  // Prioritas: unduh rilis TERBARU dari GitHub (bukan yt-dlp sistem yang bisa
  // saja sudah lawas — mis. sistem lama gagal menangani TikTok). yt-dlp sistem
  // hanya dipakai bila unduhan gagal (jaringan bermasalah) sebagai cadangan.
  onStatus?.('Mengunduh yt-dlp rilis terbaru (butuh koneksi internet)...')
  try {
    await downloadFile(YTDLP_DOWNLOAD_URL, localPath)
    // `chmod` hanya relevan di Unix; di Windows tidak diperlukan.
    if (process.platform !== 'win32') {
      await fs.promises.chmod(localPath, 0o755)
    }
    onStatus?.('yt-dlp siap digunakan.')
    return localPath
  } catch {
    const systemPath = await findSystemCommand(YTDLP_BIN_NAME)
    if (systemPath) {
      onStatus?.('Gagal mengunduh yt-dlp; memakai yt-dlp dari sistem (mungkin versi lama).')
      return systemPath
    }
    onStatus?.('Gagal mengunduh yt-dlp. Periksa koneksi internet lalu coba lagi.')
    return null
  }
}

/**
 * Memaksa yt-dlp diunduh ulang ke rilis terbaru (self-heal saat extractor gagal).
 * Menghapus binary lokal lama, mereset cache single-flight, lalu provisioning
 * ulang — akan mengunduh rilis terbaru dari GitHub.
 */
async function ensureLatestYtdlp(onStatus?: (message: string) => void): Promise<string | null> {
  const binDir = getEngineBinDir()
  const localPath = path.join(binDir, YTDLP_BIN_NAME)
  try {
    if (await isFile(localPath)) {
      await fs.promises.unlink(localPath)
    }
  } catch {
    // Abaikan: folder mungkin tidak ada / tidak bisa dihapus.
  }
  resetYtdlpCache()
  return ensureYtdlp(onStatus)
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

/** Batas unduhan paralel saat opsi `parallel` aktif (agar stabil & tidak kena rate-limit berlebihan). */
const MAX_PARALLEL_DOWNLOADS = 2

/**
 * Memulai unduhan untuk BANYAK URL (batch).
 * Default: berurutan. Bila `options.parallel` true → maks 2 sekaligus.
 * Progress dilaporkan per URL (id = url); di akhir melaporkan ringkasan.
 */
export async function startDownloadBatch(
  urls: string[],
  onProgress: (p: DownloadProgress) => void,
  onComplete: (r: DownloadBatchComplete) => void,
  options: DownloadOptions = {}
): Promise<void> {
  if (options.parallel === true && urls.length > 1) {
    let success = 0
    let failed = 0
    let cursor = 0
    const worker = async (): Promise<void> => {
      while (cursor < urls.length) {
        const url = urls[cursor]
        cursor += 1
        const ok = await downloadSingle(url, onProgress, options)
        if (ok) success++
        else failed++
      }
    }
    const workers = Array.from({ length: Math.min(MAX_PARALLEL_DOWNLOADS, urls.length) }, () => worker())
    await Promise.all(workers)
    onComplete({ total: urls.length, success, failed })
    return
  }

  let success = 0
  let failed = 0
  for (const url of urls) {
    const ok = await downloadSingle(url, onProgress, options)
    if (ok) success++
    else failed++
  }
  onComplete({ total: urls.length, success, failed })
}

/** Batas retry untuk kegagalan extractor yang bersifat sementara (mis. Facebook). */
const MAX_RETRIES = 2
/** Pola error transien yang layak dicoba ulang (ekstraksi gagal sebelum unduhan). */
const TRANSIENT_ERROR_RE =
  /Cannot parse data|Unexpected response|Unable to download webpage|HTTP Error [45]\d\d|Please try again|Requested format is not available|Sign in to confirm/i

/**
 * Pola error "masalah extractor/situs" (bukan koneksi pengguna) yang memicu
 * jalur pemulihan: coba ulang dengan workaround lalu auto-update yt-dlp.
 */
const EXTRACTOR_ISSUE_RE =
  /report this issue on https?:\/\/github\.com|Confirm you are on the latest version|Cannot parse data|Unexpected response|Unable to download webpage|Sign in to confirm|Requested format is not available/i

/**
 * User-Agent Chrome yang dikirim saat ekstraktor gagal — TikTok mulai menolak
 * permintaan non-browser (bot-detection baru, lihat yt-dlp issue #17403).
 * Dilaporkan memulihkan sebagian besar unduhan TikTok/Facebook.
 */
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

/** Sudahkah yt-dlp di-update sendiri pada sesi proses ini (self-heal sekali saja). */
let ytdlpSelfHealed = false

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Mengunduh satu URL dengan lapisan pemulihan berjenjang:
 * 1) percobaan normal + retry transien (backoff),
 * 2) workaround extractor (Chrome user-agent) bila situs menolak,
 * 3) self-heal: perbarui yt-dlp ke rilis terbaru lalu coba lagi (sekali per sesi).
 */
async function downloadSingle(
  url: string,
  onProgress: (p: DownloadProgress) => void,
  options: DownloadOptions = {}
): Promise<boolean> {
  const id = url
  let lastError = ''

  // Lapisan 1: percobaan normal + retry transien.
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      onProgress({ id, url, percent: 0, status: 'downloading', phase: 'retrying' })
      await sleep(2000 * attempt)
    }
    const result = await runYtdlpDownload(url, id, onProgress, options)
    if (result.ok) return true
    lastError = result.error ?? ''
    if (!result.retryable) break
  }

  // Lapisan 2: error extractor/situs (mis. TikTok bot-detection) → coba lagi
  // dengan user-agent Chrome yang meniru browser asli.
  if (EXTRACTOR_ISSUE_RE.test(lastError)) {
    const workaroundArgs = ['--user-agent', CHROME_USER_AGENT]
    onProgress({ id, url, percent: 0, status: 'downloading', phase: 'retrying' })
    const wResult = await runYtdlpDownload(url, id, onProgress, options, workaroundArgs)
    if (wResult.ok) return true

    // Lapisan 3: self-heal — perbarui yt-dlp ke rilis terbaru (sekali per sesi)
    // lalu coba lagi. Bila yt-dlp sudah menerbitkan perbaikan extractor
    // (mis. TikTok), unduhan pulih otomatis tanpa campur tangan pengguna.
    if (!ytdlpSelfHealed) {
      ytdlpSelfHealed = true
      onProgress({ id, url, percent: 0, status: 'downloading', phase: 'retrying' })
      await ensureLatestYtdlp()
      const hResult = await runYtdlpDownload(url, id, onProgress, options, workaroundArgs)
      if (hResult.ok) return true
      lastError = hResult.error ?? lastError
    } else {
      lastError = wResult.error ?? lastError
    }
  }

  onProgress({ id, url, percent: 0, status: 'failed', error: friendlyDownloadError(lastError) })
  return false
}

interface YtdlpRunResult {
  ok: boolean
  error?: string
  sawDownloadStart: boolean
  retryable: boolean
}

/** Menjalankan satu proses yt-dlp dan melaporkan progress/metadata realtime. */
async function runYtdlpDownload(
  url: string,
  id: string,
  onProgress: (p: DownloadProgress) => void,
  options: DownloadOptions,
  extraArgs: string[] = []
): Promise<YtdlpRunResult> {
  const ytdlp = await ensureYtdlp()
  if (!ytdlp) {
    return {
      ok: false,
      error: 'yt-dlp tidak tersedia. Periksa koneksi internet lalu coba lagi.',
      sawDownloadStart: false,
      retryable: false
    }
  }
  const outDir = getDownloadDir()
  await fs.promises.mkdir(outDir, { recursive: true })
  const outputTemplate = path.join(outDir, '%(title).80B [%(id)s].%(ext)s')
  const args = buildDownloadArgs(outputTemplate, url, options, extraArgs)

  return await new Promise<YtdlpRunResult>((resolve) => {
    const proc = spawn(ytdlp, args)
    // Lacak PID agar System Monitor menyertakan beban CPU/RAM yt-dlp.
    trackProcess(proc.pid ?? 0)

    let sawDownloadStart = false
    let stderrTail = ''
    let stdoutBuf = ''
    let lastEmitAt = 0
    let coalesced: DownloadProgress | null = null
    const meta: { title?: string; thumbnail?: string; description?: string; filePath?: string } = {}

    const emitProgress = (p: Partial<DownloadProgress>): void => {
      const now = Date.now()
      const full: DownloadProgress = {
        id,
        url,
        ...p,
        percent: p.percent ?? 0,
        status: p.status ?? 'downloading'
      }
      if (now - lastEmitAt >= 300) {
        lastEmitAt = now
        coalesced = null
        onProgress(full)
      } else {
        coalesced = full
      }
    }
    const flushProgress = (): void => {
      if (coalesced) {
        onProgress(coalesced)
        coalesced = null
      }
    }

    const handleLine = (line: string): void => {
      if (/\[download\]\s+Destination:/.test(line)) {
        sawDownloadStart = true
        emitProgress({ percent: 0, status: 'downloading', phase: 'downloading' })
        return
      }
      if (/Merging formats into|\[Merger\]/.test(line)) {
        emitProgress({ percent: 100, status: 'downloading', phase: 'merging' })
        return
      }
      if (line.startsWith('__RSMETA__')) {
        const raw = line.slice('__RSMETA__'.length).trim()
        try {
          const obj = JSON.parse(raw) as Record<string, unknown>
          meta.title = typeof obj.title === 'string' ? obj.title.slice(0, 1000) : undefined
          meta.thumbnail = typeof obj.thumbnail === 'string' ? obj.thumbnail.slice(0, 2000) : undefined
          meta.filePath = typeof obj.filepath === 'string' ? obj.filepath : undefined
          meta.description =
            typeof obj.description === 'string' ? obj.description.slice(0, 1000) : undefined
        } catch {
          // Baris metadata tidak valid — abaikan, progress tetap berjalan.
        }
        return
      }
      const parsed = parseProgressLine(line)
      if (parsed) {
        if (parsed.percent > 0) sawDownloadStart = true
        emitProgress({
          percent: parsed.percent,
          status: 'downloading',
          phase: 'downloading',
          speedBytesPerSec: parsed.speed,
          etaSeconds: parsed.eta,
          sizeBytes: parsed.sizeBytes
        })
      }
    }

    proc.stdout.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString()
      let nl: number
      while ((nl = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, nl).replace(/\r$/, '')
        stdoutBuf = stdoutBuf.slice(nl + 1)
        handleLine(line)
      }
    })
    proc.stdout.on('end', () => {
      if (stdoutBuf.trim()) handleLine(stdoutBuf.replace(/\r$/, ''))
      stdoutBuf = ''
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      if (stderrTail.length < 4000) stderrTail += text
    })

    proc.on('error', () => {
      untrackProcess(proc.pid ?? 0)
      flushProgress()
      resolve({ ok: false, error: 'Gagal menjalankan yt-dlp.', sawDownloadStart, retryable: false })
    })

    proc.on('close', (code) => {
      untrackProcess(proc.pid ?? 0)
      flushProgress()
      if (code === 0) {
        onProgress({ id, url, percent: 100, status: 'success', phase: 'done', ...meta })
        resolve({ ok: true, sawDownloadStart, retryable: false })
      } else {
        const error = stderrTail.trim() || 'Unduhan gagal.'
        const retryable = !sawDownloadStart && TRANSIENT_ERROR_RE.test(error)
        resolve({ ok: false, error, sawDownloadStart, retryable })
      }
    })
  })
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

/**
 * Argumen yt-dlp sesuai opsi: batas resolusi (`-f`) dan cookies browser
 * (`--cookies-from-browser`) untuk situs yang membatasi unduhan anonim
 * (Facebook/Instagram). Metadata (title/thumbnail/description/filepath)
 * ditangkap via `--print after_move` (JSON-encoded agar aman dari
 * karakter tab/baris baru).
 */
function buildDownloadArgs(
  outputTemplate: string,
  url: string,
  options: DownloadOptions,
  extraArgs: string[] = []
): string[] {
  const args = ['--newline', '--no-playlist', '--progress', ...extraArgs]
  // Metadata ditangkap via --print after_move sebagai SATU objek JSON valid
  // (setiap field di-encode dengan %(field)j agar aman dari newline/tab).
  args.push(
    '--print',
    'after_move:__RSMETA__{"title":%(title)j,"thumbnail":%(thumbnail)j,"filepath":%(filepath)j,"description":%(description)j}'
  )
  if (options.maxHeight && options.maxHeight > 0) {
    args.push('-f', `bv*[height<=${options.maxHeight}]+ba/b[height<=${options.maxHeight}]`)
  }
  if (options.cookiesBrowser && options.cookiesBrowser.trim()) {
    args.push('--cookies-from-browser', options.cookiesBrowser.trim())
  }
  args.push('-o', outputTemplate, url)
  return args
}

/**
 * Menerjemahkan error yt-dlp agar lebih ramah pengguna, terutama untuk
 * kegagalan extractor (mis. TikTok/Facebook) yang bukan kesalahan koneksi
 * pengguna. Aplikasi sudah otomatis mencoba ulang + memperbarui yt-dlp.
 */
function friendlyDownloadError(raw: string): string {
  const tail = lastLines(raw)
  if (/Cannot parse data|Unexpected response|report this issue|Confirm you are on the latest version/i.test(raw)) {
    // TikTok memperketat bot-detection (Agustus 2026) yang memengaruhi SEMUA
    // pengunduh berbasis yt-dlp di dunia. App sudah otomatis memperbarui
    // yt-dlp & mencoba ulang — bila masih gagal, tunggu perbaikan yt-dlp.
    return `${tail} — Platform (TikTok/Facebook) memperketat proteksi anti-bot; ini memengaruhi semua pengunduh. Sudah dicoba ulang otomatis dengan user-agent browser & yt-dlp terbaru. Bila masih gagal, coba lagi nanti (perbaikan yt-dlp), atau aktifkan Cookies Browser di Pengaturan Unduhan sebagai alternatif.`
  }
  return tail
}

interface ParsedProgress {
  percent: number
  speed?: number
  eta?: number
  sizeBytes?: number
}

/** Mengurai baris progress yt-dlp: persen, kecepatan, ETA, dan ukuran total. */
function parseProgressLine(line: string): ParsedProgress | null {
  const m = /\[download\]\s+(\d+(?:\.\d+)?)%/.exec(line)
  if (!m) return null
  const percent = Math.min(100, Number.parseFloat(m[1]))
  return {
    percent,
    speed: parseSize(line, /at\s+([\d.]+)\s*([KMG]i?B)\/s/i),
    eta: parseEta(line),
    sizeBytes: parseSize(line, /of\s+([\d.]+)\s*([KMG]i?B)/i)
  }
}

/** Mengurai ukuran (mis. "11.28MiB") menjadi byte. */
function parseSize(line: string, re: RegExp): number | undefined {
  const m = re.exec(line)
  if (!m) return undefined
  const n = Number.parseFloat(m[1])
  if (!Number.isFinite(n)) return undefined
  const unit = m[2].toUpperCase()
  if (unit.startsWith('G')) return Math.round(n * 1024 ** 3)
  if (unit.startsWith('M')) return Math.round(n * 1024 ** 2)
  if (unit.startsWith('K')) return Math.round(n * 1024)
  return Math.round(n)
}

/** Mengurai ETA yt-dlp ("MM:SS" / "HH:MM:SS") menjadi detik. */
function parseEta(line: string): number | undefined {
  const m = /ETA\s+(\d+):(\d+)(?::(\d+))?/.exec(line)
  if (!m) return undefined
  const a = Number(m[1])
  const b = Number(m[2])
  const c = m[3] !== undefined ? Number(m[3]) : undefined
  if (c !== undefined) return a * 3600 + b * 60 + c
  return a * 60 + b
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
  // Pencari perintah lintas-OS: `which` di macOS/Linux, `where` di Windows.
  const finder = process.platform === 'win32' ? 'where' : 'which'
  return new Promise((resolve) => {
    execFile(finder, [command], { timeout: 2000, windowsHide: true }, (err, stdout) => {
      if (err) {
        resolve(null)
        return
      }
      // `where` dapat mengembalikan beberapa baris; pakai baris pertama.
      const first = stdout
        .split(/\r?\n/)
        .map((s) => s.trim())
        .find((s) => s.length > 0)
      resolve(first ?? null)
    })
  })
}
