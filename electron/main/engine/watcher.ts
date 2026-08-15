import { Notification } from 'electron'
import { getConfig, setConfig, type WatchedAccount } from '../config'
import {
  scrapeAccount,
  resolveAccountInfo,
  type ScrapeItem,
  type DownloadProgress,
  type AccountProfileInfo
} from './downloader'
import { isTikTokUrl, resolveTikTokProfile } from './tiktok'
import { enqueueBatch } from './queue'
import { processBatch, type ProcessFileInput } from './processor'
import { getDownloadDir } from './paths'

/**
 * Auto-Watcher (Fase 5).
 *
 * Memantau akun/halaman video secara berkala SELAMA APLIKASI TERBUKA
 * (setInterval di main process; berhenti saat app ditutup — tidak ada
 * tray/auto-start). Deteksi posting baru via `scrapeAccount` dengan
 * `--playlist-items 1-3` (fetchLimit kecil) + perbandingan cursor
 * (`lastSeenId`). Item baru → antrean unduhan terpusat (queue.ts) →
 * auto-clean preset 'metadata' (stripping metadata untuk privasi).
 */

export interface WatcherNotifyEvent {
  title: string
  body: string
}

/** Jumlah item terbaru yang diambil tiap pengecekan (cukup utk deteksi baru). */
const WATCHER_FETCH_LIMIT = 3

let timer: NodeJS.Timeout | null = null
let firstTimer: NodeJS.Timeout | null = null
let checking = false

type NotifyCb = (e: WatcherNotifyEvent) => void
let notifyCb: NotifyCb | null = null

/** Daftarkan callback notifikasi (main → renderer, via emit watcher:notify). */
export function setWatcherNotify(cb: NotifyCb | null): void {
  notifyCb = cb
}

function watcherNotify(title: string, body: string): void {
  // Notifikasi native — tetap muncul saat jendela diminimalkan.
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
  notifyCb?.({ title, body })
}

/** Mulai interval pemantauan (idempotent). Hanya berjalan saat app terbuka. */
export function startWatcher(): void {
  stopWatcher()
  const cfg = getConfig().watcher
  if (!cfg.enabled || cfg.accounts.length === 0) return
  const intervalMs = Math.max(0.1, cfg.intervalHours) * 3600 * 1000
  timer = setInterval(() => void runAllChecks(), intervalMs)
  // Pengecekan pertama setelah engine siap — tick pertama menginisialisasi cursor.
  firstTimer = setTimeout(() => void runAllChecks(), 6000)
}

/** Hentikan interval pemantauan. */
export function stopWatcher(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (firstTimer) {
    clearTimeout(firstTimer)
    firstTimer = null
  }
}

/** Cek semua akun secara serial (tanpa tumpang tindih antrean cek). */
async function runAllChecks(): Promise<void> {
  if (checking) return
  checking = true
  try {
    const accounts = getConfig().watcher.accounts
    for (const acc of accounts) {
      try {
        await checkAccountOnce(acc)
      } catch (err) {
        console.error('[Watcher] gagal memeriksa akun:', acc.url, err)
      }
    }
  } finally {
    checking = false
  }
}

/** Perbarui satu akun di config tanpa mengubah/restart interval. */
function updateAccount(url: string, patch: Partial<WatchedAccount>): WatchedAccount | null {
  const cur = getConfig()
  const accounts = cur.watcher.accounts
  const idx = accounts.findIndex((a) => a.url === url)
  if (idx === -1) return null
  const updated = { ...accounts[idx], ...patch }
  const next = [...accounts]
  next[idx] = updated
  setConfig({ watcher: { accounts: next } })
  return updated
}

/**
 * Cek satu akun sekali:
 * - Tick pertama (belum ada `lastSeenId`) → set cursor saja (jangan unduh semua lama).
 * - Tidak ada posting baru → perbarui lastCheckedAt.
 * - Ada posting baru → unduh via queue.ts → auto-clean (preset 'metadata') → notifikasi.
 */
export async function checkAccountOnce(
  acc: WatchedAccount
): Promise<{ newItems: ScrapeItem[] } | { error: string }> {
  try {
    const result = await scrapeAccount(acc.url, {}, WATCHER_FETCH_LIMIT)
    const newestId = result.items[0]?.id
    if (!newestId) {
      updateAccount(acc.url, { lastCheckedAt: Date.now() })
      return { error: 'Tidak ada video yang terdeteksi pada akun ini.' }
    }

    const prevSeen = acc.lastSeenId
    const base = { lastCheckedAt: Date.now() }

    // Inisialisasi cursor — jangan unduh video lama.
    if (!prevSeen) {
      updateAccount(acc.url, { ...base, lastSeenId: newestId })
      return { newItems: [] }
    }

    // Tidak ada posting baru.
    if (newestId === prevSeen) {
      updateAccount(acc.url, base)
      return { newItems: [] }
    }

    // Ada posting baru — cursor maju ke video terbaru.
    const newItems = result.items.filter((it) => it.id !== prevSeen)
    updateAccount(acc.url, {
      ...base,
      lastSeenId: newestId,
      lastFoundAt: Date.now()
    })

    if (newItems.length > 0) {
      const label = acc.label || acc.url
      watcherNotify(
        `${newItems.length} video baru terdeteksi`,
        `Dari ${label} — sedang diunduh otomatis.`
      )
      const downloaded: ProcessFileInput[] = []
      enqueueBatch({
        urls: newItems.map((it) => it.url),
        options: {},
        source: 'watcher',
        onProgress: (p: DownloadProgress) => {
          if (p.status === 'success' && p.filePath) {
            downloaded.push({ id: p.url, path: p.filePath, name: p.title || p.url })
          }
        },
        onComplete: (r) => {
          if (r.success > 0 && downloaded.length > 0) {
            void processBatch(downloaded, 'metadata', () => {
              /* auto-clean berjalan tanpa progress UI */
            })
              .then(() => {
                watcherNotify(
                  `${downloaded.length} video baru telah diunduh`,
                  `Tersimpan di ${getDownloadDir()}`
                )
              })
              .catch((err) => {
                console.error('[Watcher] auto-clean gagal:', err)
              })
          }
        }
      })
    }
    return { newItems }
  } catch (err) {
    // Catat waktu percobaan (walau gagal) agar status "Terakhir cek" akurat.
    updateAccount(acc.url, { lastCheckedAt: Date.now() })
    return { error: err instanceof Error ? err.message : 'Gagal memeriksa akun.' }
  }
}

/** Hasil verifikasi/resolusi detail akun (dipakai IPC `watcher:resolve`). */
export interface AccountInfo {
  url: string
  /** Sudah terdaftar di Auto-Watcher (duplikat). */
  duplicate: boolean
  /** Terverifikasi ada (profil berhasil diambil). */
  exists: boolean
  name?: string
  username?: string
  avatar?: string
  followers?: number
  bio?: string
  platform?: string
  /** Pesan bila tidak dapat diverifikasi. */
  error?: string
}

/**
 * Validasi + ambil detail profil sebuah akun sebelum dipantau.
 * - Duplikat (sudah terdaftar) → `duplicate: true` (tanpa panggilan jaringan).
 * - Resolve via yt-dlp; bila gagal & platform TikTok → parse SSR halaman profil.
 * - Gagal semua → `exists: false` + pesan jujur (bukan klaim "tidak ada" palsu).
 */
export async function resolveAccount(url: string): Promise<AccountInfo> {
  const accounts = getConfig().watcher.accounts
  if (accounts.some((a) => a.url === url)) {
    return { url, duplicate: true, exists: true }
  }

  // 1. yt-dlp (YouTube & platform lain yang tidak memblokir).
  try {
    const info: AccountProfileInfo | null = await resolveAccountInfo(url)
    if (info) {
      return {
        url,
        duplicate: false,
        exists: true,
        name: info.name,
        username: info.username,
        avatar: info.avatar,
        followers: info.followers,
        bio: info.bio,
        platform: info.platform
      }
    }
  } catch {
    /* lanjut ke jalur TikTok */
  }

  // 2. TikTok: parse SSR halaman profil (best-effort).
  if (isTikTokUrl(url)) {
    try {
      const prof = await resolveTikTokProfile(url)
      if (prof) {
        return { url, duplicate: false, exists: true, ...prof, platform: 'TikTok' }
      }
    } catch {
      /* gagal — jatuh ke pesan jujur */
    }
  }

  return {
    url,
    duplicate: false,
    exists: false,
    error:
      'Akun tidak ditemukan atau tidak dapat diverifikasi saat ini (platform memblokir pemeriksaan atau akun tidak ada).'
  }
}
