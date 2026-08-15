import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  RadioTower,
  Trash2,
  RefreshCw,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  UserRound,
  Users,
  SearchCheck,
  UserPlus,
  Lock
} from 'lucide-react'
import { FloatingInput } from './ui/FloatingField'
import Toggle from './ui/Toggle'
import ConfirmModal from './ConfirmModal'
import type { WatchedAccount, AccountInfo } from '@lib/types'

/** Panel Auto-Watcher — pemantauan akun otomatis saat aplikasi terbuka. */
export default function WatcherPanel({
  onNotify,
  onChange
}: {
  onNotify: (title: string, body: string) => void
  /** Laporan perubahan daftar akun ke parent (mis. badge jumlah akun). */
  onChange?: (accounts: WatchedAccount[]) => void
}): React.ReactElement {
  const [enabled, setEnabled] = useState(false)
  const [intervalHours, setIntervalHours] = useState(1)
  const [accounts, setAccounts] = useState<WatchedAccount[]>([])
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [checkingAll, setCheckingAll] = useState(false)
  const [checkingUrl, setCheckingUrl] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [preview, setPreview] = useState<AccountInfo | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<WatchedAccount | null>(null)

  const load = (): void => {
    window.api
      ?.getWatcherConfig?.()
      .then((cfg) => {
        setEnabled(cfg?.enabled ?? false)
        setIntervalHours(cfg?.intervalHours ?? 1)
        const list = cfg?.accounts ?? []
        setAccounts(list)
        onChange?.(list)
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyConfig = (cfg: {
    enabled: boolean
    intervalHours: number
    accounts: WatchedAccount[]
  }): void => {
    setEnabled(cfg?.enabled ?? false)
    setIntervalHours(cfg?.intervalHours ?? 1)
    const list = cfg?.accounts ?? []
    setAccounts(list)
    onChange?.(list)
  }

  /** Validasi tautan akun (ada/tidak/duplikat) lalu tampilkan preview profil. */
  const resolveAndPreview = (): void => {
    const u = url.trim()
    if (!u) return
    setResolving(true)
    setResolveError(null)
    setPreview(null)
    window.api
      ?.resolveWatchedAccount?.(u)
      .then((info) => {
        if (!info) return
        if (info.duplicate) {
          onNotify('Akun sudah dipantau', 'Tautan ini sudah terdaftar di Auto-Watcher.')
          setUrl('')
          setLabel('')
        } else if (info.exists) {
          setPreview(info)
        } else {
          const msg = info.error || 'Akun tidak ditemukan atau tidak dapat diverifikasi.'
          setResolveError(msg)
          onNotify('Akun tidak dapat diverifikasi', msg)
        }
      })
      .catch(() => {
        setResolveError('Gagal memvalidasi akun. Coba lagi.')
        onNotify('Gagal memvalidasi akun', 'Terjadi kesalahan saat memeriksa akun.')
      })
      .finally(() => setResolving(false))
  }

  /** Tambah akun hasil preview (setelah user mengonfirmasi detail). */
  const confirmAdd = (): void => {
    if (!preview) return
    const display = preview.name || preview.username || preview.url
    window.api
      ?.addWatchedAccount?.({
        url: preview.url,
        label: label.trim() || undefined,
        profile: {
          name: preview.name,
          username: preview.username,
          avatar: preview.avatar,
          followers: preview.followers,
          bio: preview.bio,
          platform: preview.platform
        }
      })
      .then((cfg) => {
        applyConfig(cfg)
        onNotify('Akun ditambahkan', `${display} kini dipantau secara otomatis.`)
        setUrl('')
        setLabel('')
        setPreview(null)
      })
      .catch(() => onNotify('Gagal menambahkan akun', 'Terjadi kesalahan.'))
  }

  const askRemove = (acc: WatchedAccount): void => {
    setPendingRemove(acc)
  }

  const confirmRemove = (): void => {
    const acc = pendingRemove
    if (!acc) return
    setPendingRemove(null)
    const display = acc.name || acc.username || acc.label || acc.url
    window.api
      ?.removeWatchedAccount?.(acc.url)
      .then((cfg) => {
        applyConfig(cfg)
        onNotify('Akun dihapus dari Auto-Watcher', display)
      })
      .catch(() => onNotify('Gagal menghapus akun', 'Terjadi kesalahan.'))
  }

  const toggleEnabled = (v: boolean): void => {
    setEnabled(v)
    window.api?.setWatcherEnabled?.(v).then((cfg) => applyConfig(cfg))
    onNotify(v ? 'Auto-Watcher diaktifkan' : 'Auto-Watcher dimatikan', v ? 'Akun akan diperiksa secara berkala.' : 'Pemantauan otomatis dihentikan.')
  }

  const setInterval = (v: number): void => {
    const h = Number.isFinite(v) && v > 0 ? v : 1
    setIntervalHours(h)
    window.api?.setWatcherInterval?.(h).then((cfg) => applyConfig(cfg))
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
            onNotify(n > 0 ? `${n} video baru ditemukan` : 'Tidak ada video baru', n > 0 ? 'Video baru sedang diunduh otomatis.' : 'Akun sudah diperbarui.')
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
        onNotify(total > 0 ? `${total} video baru ditemukan` : 'Tidak ada video baru', total > 0 ? 'Video baru sedang diunduh otomatis.' : 'Semua akun sudah diperiksa dan diperbarui.')
      })
      .catch(() => onNotify('Gagal memeriksa akun', 'Terjadi kesalahan saat memeriksa.'))
      .finally(() => setCheckingAll(false))
  }

  const formatTime = (ts?: number): string => {
    if (!ts) return 'Belum pernah'
    return new Date(ts).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCount = (n?: number): string => {
    if (n === undefined || !Number.isFinite(n)) return ''
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} Jt`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')} rb`
    return String(n)
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
  const hasInput = url.trim().length > 0

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

      {enabled ? (
        <>
      {/* Interval + Cek Sekarang */}
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

      {/* Tambah akun (validasi + preview) */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 min-w-0">
          <FloatingInput
            type="url"
            label="Tautan akun / halaman"
            icon={<RadioTower className="h-4 w-4" />}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setPreview(null)
              setResolveError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                resolveAndPreview()
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
                resolveAndPreview()
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={resolveAndPreview}
          disabled={!hasInput || resolving}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition-all hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
          Periksa
        </button>
      </div>

      {/* Hasil validasi / preview profil */}
      {resolving && (
        <div className="flex items-center gap-2 rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/10 px-3 py-2.5 text-xs text-violet-600 dark:text-violet-300">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Memvalidasi akun...
        </div>
      )}

      {!resolving && preview && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
          className="flex flex-col gap-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Akun ditemukan
          </div>
          <div className="flex items-start gap-3">
            {preview.avatar ? (
              <img
                src={preview.avatar}
                alt=""
                className="w-14 h-14 rounded-full object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
              />
            ) : (
              <div className="w-14 h-14 rounded-full shrink-0 flex items-center justify-center bg-violet-100 dark:bg-slate-800 text-violet-500 dark:text-violet-400">
                <UserRound className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {preview.name || preview.username || preview.url}
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {preview.username ? `@${preview.username}` : preview.url}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                {preview.platform && (
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                    {preview.platform}
                  </span>
                )}
                {preview.followers !== undefined && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {formatCount(preview.followers)} pengikut
                  </span>
                )}
              </div>
              {preview.bio && (
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-400 dark:text-slate-500">{preview.bio}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={confirmAdd}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition-all hover:bg-violet-700 active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            Pantau Akun Ini
          </button>
        </motion.div>
      )}

      {!resolving && resolveError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10 px-3 py-2.5 text-xs text-rose-600 dark:text-rose-300">
          <XCircle className="w-4 h-4 shrink-0" />
          {resolveError}
        </div>
      )}

      {/* Daftar akun */}
      {accounts.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {accounts.map((acc) => {
            const isChecking = checkingUrl === acc.url
            const displayName = acc.name || acc.label || acc.username || platformOf(acc.url)
            return (
              <motion.li
                key={acc.url}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2.5"
              >
                {acc.avatar ? (
                  <img
                    src={acc.avatar}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-violet-50 dark:bg-slate-800 text-violet-500 dark:text-violet-400">
                    <UserRound className="w-4.5 h-4.5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {displayName}
                    </span>
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                      {acc.platform || platformOf(acc.url)}
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
                  {isChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => askRemove(acc)}
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
          {enabled ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-slate-400" />}
          Belum ada akun yang dipantau. Masukkan tautan akun di atas, lalu tekan "Periksa" untuk memvalidasi.
        </p>
      )}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
        Tautan akun divalidasi terlebih dahulu (ada/tidak ada). Akun baru diunduh otomatis saat ada posting,
        dibersihkan metadatanya, lalu disimpan ke folder Unduhan.
      </p>
        </>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
          <Lock className="h-4 w-4 shrink-0" />
          Auto-Watcher nonaktif — aktifkan untuk menambahkan akun, mengatur interval, dan memeriksa.
        </div>
      )}

      {/* Modal konfirmasi hapus akun */}
      <ConfirmModal
        confirmAction={
          pendingRemove
            ? {
                type: 'removeAccount',
                detail: pendingRemove.name || pendingRemove.username || pendingRemove.label || pendingRemove.url
              }
            : null
        }
        onClose={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
