import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

/** Entri riwayat unduhan (persist di main process, bukan localStorage). */
export interface HistoryEntry {
  url: string
  title?: string
  thumbnail?: string
  filePath: string
  platform?: string
  ts: number
}

/** Akun yang dipantau Auto-Watcher. */
export interface WatchedAccount {
  url: string
  label?: string
  lastSeenId?: string
  lastCheckedAt?: number
  lastFoundAt?: number
}

/** Mode pemrosesan hardware (encoder GPU) — dipakai processor.ts. */
export type HwAccelMode = 'auto' | 'videotoolbox' | 'nvenc' | 'amf'

/**
 * Konfigurasi aplikasi yang TERSIMPAN DI MAIN PROCESS (file JSON di userData).
 * Berisi data yang lebih sensitif/berat (proxy, watcher, riwayat) yang tidak
 * seharusnya plaintext di localStorage renderer.
 */
export interface AppConfig {
  proxy: {
    enabled: boolean
    /** Daftar URL proxy: http(s)://user:pass@host:port atau socks5://... */
    proxies: string[]
    /** Ganti proxy setelah N unduhan (rotasi IP anti-banned). */
    rotationEvery: number
  }
  watcher: {
    enabled: boolean
    intervalHours: number
    accounts: WatchedAccount[]
  }
  hwAccel: {
    mode: HwAccelMode
  }
  analyticsExport: boolean
  history: HistoryEntry[]
}

export const CONFIG_DEFAULTS: AppConfig = {
  proxy: { enabled: false, proxies: [], rotationEvery: 5 },
  watcher: { enabled: false, intervalHours: 1, accounts: [] },
  hwAccel: { mode: 'auto' },
  analyticsExport: false,
  history: []
}

/** Batas maksimum entri riwayat yang disimpan (terbaru di depan). */
const HISTORY_CAP = 500

type ConfigPatch = {
  proxy?: Partial<AppConfig['proxy']>
  watcher?: Partial<Omit<AppConfig['watcher'], 'accounts'>> & { accounts?: WatchedAccount[] }
  hwAccel?: Partial<AppConfig['hwAccel']>
  analyticsExport?: boolean
  history?: HistoryEntry[]
}

let cache: AppConfig | null = null

export function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'omni-config.json')
}

/** Baca konfigurasi dari disk (dengan cache; default bila belum ada). */
export function getConfig(): AppConfig {
  if (cache) return cache
  const defaults: AppConfig = {
    proxy: { ...CONFIG_DEFAULTS.proxy },
    watcher: { ...CONFIG_DEFAULTS.watcher },
    hwAccel: { ...CONFIG_DEFAULTS.hwAccel },
    analyticsExport: CONFIG_DEFAULTS.analyticsExport,
    history: []
  }
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    cache = {
      proxy: { ...defaults.proxy, ...(parsed.proxy ?? {}) },
      watcher: { ...defaults.watcher, ...(parsed.watcher ?? {}) },
      hwAccel: { ...defaults.hwAccel, ...(parsed.hwAccel ?? {}) },
      analyticsExport: parsed.analyticsExport ?? defaults.analyticsExport,
      history: Array.isArray(parsed.history) ? parsed.history : []
    }
  } catch {
    cache = defaults
  }
  return cache
}

/** Tulis konfigurasi (merge patch) — atomik (tmp + rename) agar tidak korup. */
export function setConfig(patch: ConfigPatch): AppConfig {
  const cur = getConfig()
  const next: AppConfig = {
    proxy: { ...cur.proxy, ...(patch.proxy ?? {}) },
    watcher: { ...cur.watcher, ...(patch.watcher ?? {}) },
    hwAccel: { ...cur.hwAccel, ...(patch.hwAccel ?? {}) },
    analyticsExport: patch.analyticsExport ?? cur.analyticsExport,
    history: patch.history ?? cur.history
  }
  cache = next
  const p = getConfigPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  const tmp = `${p}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8')
  fs.renameSync(tmp, p)
  return next
}

/** Tambah entri riwayat unduhan (terbaru di depan, dibatasi HISTORY_CAP). */
export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  const cur = getConfig()
  const history = [entry, ...(cur.history ?? [])].slice(0, HISTORY_CAP)
  setConfig({ history })
  return history
}

/** Kosongkan riwayat unduhan. */
export function clearHistory(): void {
  setConfig({ history: [] })
}
