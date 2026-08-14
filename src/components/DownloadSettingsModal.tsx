import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Settings, KeyRound, Info, XCircle, RotateCcw } from 'lucide-react'

/** Nilai pengaturan unduhan (draf diedit langsung di dalam modal). */
export interface DownloadSettings {
  maxHeight: number
  cookiesBrowser: string
  douyinCookie: string
  parallel: boolean
}

const SETTINGS_DEFAULT: DownloadSettings = {
  maxHeight: 0,
  cookiesBrowser: '',
  douyinCookie: '',
  parallel: false
}

/**
 * Modal "Pengaturan Unduhan" — menggantikan kartu permanen di halaman Pengunduh
 * agar tidak mengganggu ruang kerja. Pola modal sama seperti ConfirmModal/
 * PreviewModal (tanpa AnimatePresence; motion 12 macet di StrictMode).
 * Tutup: klik backdrop, tombol X, tombol Selesai, atau tombol Escape.
 */
export default function DownloadSettingsModal({
  open,
  onClose,
  settings,
  onChange
}: {
  open: boolean
  onClose: () => void
  settings: DownloadSettings
  onChange: (patch: Partial<DownloadSettings>) => void
}): React.ReactElement | null {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const set = (patch: Partial<DownloadSettings>): void => onChange(patch)
  const isCustom = (): boolean =>
    settings.maxHeight !== SETTINGS_DEFAULT.maxHeight ||
    settings.cookiesBrowser !== SETTINGS_DEFAULT.cookiesBrowser ||
    settings.douyinCookie !== SETTINGS_DEFAULT.douyinCookie ||
    settings.parallel !== SETTINGS_DEFAULT.parallel

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 transition-colors"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-w-lg w-full relative shadow-2xl transition-colors flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div className="p-2 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
            <Settings className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">
              Pengaturan Unduhan
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Kualitas, cookies &amp; kecepatan batch.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                Kualitas
              </span>
              <select
                value={settings.maxHeight}
                onChange={(e) => set({ maxHeight: Number(e.target.value) })}
                className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value={0}>Terbaik</option>
                <option value={2160}>2160p (4K)</option>
                <option value={1440}>1440p</option>
                <option value={1080}>1080p</option>
                <option value={720}>720p</option>
                <option value={480}>480p</option>
                <option value={360}>360p</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                Cookies Browser
              </span>
              <select
                value={settings.cookiesBrowser}
                onChange={(e) => set({ cookiesBrowser: e.target.value })}
                className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">Tanpa Cookies</option>
                <option value="chrome">Chrome</option>
                <option value="edge">Edge</option>
                <option value="safari">Safari</option>
                <option value="firefox">Firefox</option>
                <option value="brave">Brave</option>
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.parallel}
              onChange={(e) => set({ parallel: e.target.checked })}
              className="accent-blue-600 w-4 h-4 shrink-0"
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Unduh 2 sekaligus
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Lebih cepat untuk banyak tautan.
              </span>
            </div>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
              <KeyRound className="w-3 h-3" />
              Cookie Douyin
              <span className="normal-case font-normal">(opsional)</span>
            </span>
            <textarea
              value={settings.douyinCookie}
              onChange={(e) => set({ douyinCookie: e.target.value })}
              rows={2}
              placeholder="Tempel header Cookie dari douyin.com yang sudah login..."
              className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none leading-relaxed"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
              Khusus Douyin (anti-bot ketat, wajib cookie sesi). Cara ambil: buka douyin.com di
              Chrome → login → F12 → Application → Cookies → https://www.douyin.com → salin
              seluruh header Cookie. Disimpan lokal &amp; dipakai yt-dlp.
            </p>
          </div>

          {settings.cookiesBrowser && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Info className="w-3 h-3 shrink-0" />
              Gunakan browser yang sudah login ke Facebook/Instagram agar unduhan lebih cepat &amp;
              jarang gagal. Tutup browser bila muncul error kunci database.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => set({ ...SETTINGS_DEFAULT })}
            disabled={!isCustom()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-95"
          >
            Selesai
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
