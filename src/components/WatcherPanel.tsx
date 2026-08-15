import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  RadioTower,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye
} from 'lucide-react'
import { FloatingInput } from './ui/FloatingField'
import Toggle from './ui/Toggle'

export interface WatcherAccountData {
  url: string
  label?: string
  lastSeenId?: string
  lastCheckedAt?: number
  lastFoundAt?: number
}

/** Panel Auto-Watcher — pemantauan akun otomatis saat aplikasi terbuka. */
export default function WatcherPanel({
  onNotify
}: {
  onNotify: (title: string, body: string) => void
}): React.ReactElement {
  const [enabled, setEnabled] = useState(false)
  const [intervalHours, setIntervalHours] = useState(1)
  const [accounts, setAccounts] = useState<WatcherAccountData[]>([])
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [checkingAll, setCheckingAll] = useState(false)
  const [checkingUrl, setCheckingUrl] = useState<string | null>(null)

  const load = (): void => {
    window.api
      ?.getWatcherConfig?.()
      .then((cfg) => {
        setEnabled(cfg?.enabled ?? false)
        setIntervalHours(cfg?.intervalHours ?? 1)
        setAccounts(cfg?.accounts ?? [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
  }, [])

  const addAccount = (): void => {
    const u = url.trim()
    if (!u) return
    window.api
      ?.addWatchedAccount?.({ url: u, label: label.trim() || undefined })
      .then((cfg) => {
        setAccounts(cfg?.accounts ?? [])
        setEnabled(cfg?.enabled ?? false)
        setUrl('')
        setLabel('')
        onNotify('Akun ditambahkan ke Auto-Watcher', u)
      })
      .catch(() => {})
  }

  const removeAccount = (u: string): void => {
    window.api
      ?.removeWatchedAccount?.(u)
      .then((cfg) => setAccounts(cfg?.accounts ?? []))
      .catch(() => {})
  }

  const toggleEnabled = (v: boolean): void => {
    setEnabled(v)
    window.api?.setWatcherEnabled?.(v).then((cfg) => {
      setEnabled(cfg?.enabled ?? v)
    })
    if (v) onNotify('Auto-Watcher diaktifkan', 'Akun akan diperiksa secara berkala.')
    else onNotify('Auto-Watcher dimatikan', 'Pemantauan otomatis dihentikan.')
  }

  const setInterval = (v: number): void => {
    const h = Number.isFinite(v) && v > 0 ? v : 1
    setIntervalHours(h)
    window.api?.setWatcherInterval?.(h).then((cfg) => setIntervalHours(cfg?.intervalHours ?? h))
  }

  const checkNow = (u?: string): void => {
    if (u) {
      setCheckingUrl(u)
      window.api
        ?.checkWatcherNow?.(u)
        .then((results) => {
          const r = results[0]
          if (r?.error) onNotify('Gagal memeriksa akun', r.error)
          else {
            const n = r?.newItems?.length ?? 0
            onNotify(
              n > 0 ? `${n} video baru ditemukan` : 'Tidak ada video baru',
              n > 0 ? 'Video baru sedang diunduh otomatis.' : 'Akun sudah diperbarui.'
            )
          }
        })
        .catch(() => onNotify('Gagal memeriksa akun', 'Terjadi kesalahan saat memeriksa.'))
        .finally(() => setCheckingUrl(null))
      return
    }
    setCheckingAll(true)
    window.api
      ?.checkWatcherNow?.()
      .then((results) => {
        const total = results.reduce((sum, r) => sum + (r?.newItems?.length ?? 0), 0)
        onNotify(
          total > 0 ? `${total} video baru ditemukan` : 'Tidak ada video baru',
          total > 0
            ? 'Video baru sedang diunduh otomatis.'
            : 'Semua akun sudah diperiksa dan diperbarui.'
        )
      })
      .catch(() => onNotify('Gagal memeriksa akun', 'Terjadi kesalahan saat memeriksa.'))
      .finally(() => setCheckingAll(false))
  }

  const formatTime = (ts?: number): string => {
    if (!ts) return 'Belum pernah'
    const d = new Date(ts)
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const platformOf = (u: string): string => {
    try {
      const host = new URL(u).hostname.toLowerCase().replace(/^www\./, '')
      if (host.endsWith('tiktok.com')) return 'TikTok'
      if (host.endsWith('instagram.com')) return 'Instagram'
      if (host.endsWith('youtube.com') || host.endsWith('youtu.be')) return 'YouTube'
      if (host.endsWith('facebook.com')) return 'Facebook'
      if (host.endsWith('douyin.com')) return 'Douyin'
      return host.split('.')[0] || 'Akun'
    } catch {
      return 'Akun'
    }
  }

  const busy = checkingAll || checkingUrl !== null

  return (
    <div className="flex flex-col gap-3">
      {/* Header + status + interval */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-violet-50 dark:bg-slate-900/50 text-violet-600 dark:text-violet-400 rounded-lg shrink-0">
            <RadioTower className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">
              Auto-Watcher
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Pantau akun secara otomatis saat aplikasi terbuka.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Toggle checked={enabled} onChange={toggleEnabled} />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {enabled ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      </div>

      {/* Interval */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-slate-400 shrink-0" />
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Periksa tiap</label>
        <input
          type="number"
          min={0.1}
          step={0.5}
          value={intervalHours}
          onChange={(e) => setInterval(Number(e.target.value))}
          className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
        />
        <span className="text-xs text-slate-500 dark:text-slate-400">jam</span>
        <button
          type="button"
          onClick={() => checkNow()}
          disabled={busy || accounts.length === 0}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-violet-500/20 transition-all hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checkingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          Cek Sekarang
        </button>
      </div>

      {/* Tambah akun */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 min-w-0">
          <FloatingInput
            type="url"
            label="Tautan akun / halaman"
            icon={<RadioTower className="h-4 w-4" />}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addAccount()
              }
            }}
          />
        </div>
        <div className="w-full sm:w-40">
          <FloatingInput
            label="Label (opsional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addAccount()
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={addAccount}
          disabled={!url.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition-all hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Pantau
        </button>
      </div>

      {/* Daftar akun */}
      {accounts.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {accounts.map((acc) => {
            const isChecking = checkingUrl === acc.url
            return (
              <motion.li
                key={acc.url}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {acc.label || platformOf(acc.url)}
                    </span>
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                      {platformOf(acc.url)}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{acc.url}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                    {acc.lastSeenId
                      ? `Terakhir cek ${formatTime(acc.lastCheckedAt)}${
                          acc.lastFoundAt ? ` · video baru ${formatTime(acc.lastFoundAt)}` : ''
                        }`
                      : 'Menunggu pemeriksaan pertama (mengatur cursor)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => checkNow(acc.url)}
                  disabled={busy}
                  aria-label="Cek sekarang"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
                >
                  {isChecking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removeAccount(acc.url)}
                  aria-label="Hapus akun"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.li>
            )
          })}
        </ul>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          {enabled ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-slate-400" />
          )}
          Belum ada akun yang dipantau. Tambahkan tautan akun di atas, lalu aktifkan Auto-Watcher.
        </p>
      )}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
        Pemeriksaan pertama hanya mengatur cursor (tidak mengunduh video lama). Video baru akan
        diunduh otomatis, dibersihkan metadatanya, lalu disimpan ke folder Unduhan.
      </p>
    </div>
  )
}
