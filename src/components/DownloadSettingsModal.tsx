import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Settings, XCircle, RotateCcw, Globe, MonitorDown, MonitorUp, Info, KeyRound } from 'lucide-react'
import FloatingSelect from './ui/FloatingSelect'
import { FloatingTextarea } from './ui/FloatingField'
import Toggle from './ui/Toggle'
import ProxyManager from './ProxyManager'

/** Nilai pengaturan unduhan (draf diedit langsung di dalam modal). */
export interface DownloadSettings {
  maxHeight: number
  cookiesBrowser: string
  douyinCookie: string
  parallel: boolean
}

const QUALITY_OPTIONS = [
  { value: '0', label: 'Terbaik' },
  { value: '2160', label: '2160p (4K)' },
  { value: '1440', label: '1440p' },
  { value: '1080', label: '1080p' },
  { value: '720', label: '720p' },
  { value: '480', label: '480p' },
  { value: '360', label: '360p' }
]

const BROWSER_OPTIONS = [
  { value: '', label: 'Tanpa Cookies' },
  { value: 'chrome', label: 'Chrome' },
  { value: 'edge', label: 'Edge' },
  { value: 'safari', label: 'Safari' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'brave', label: 'Brave' }
]

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

  // --- Pemrosesan Hardware (encoder GPU) ---
  const [hwAvailable, setHwAvailable] = useState<Array<'videotoolbox' | 'nvenc' | 'amf'>>([])
  const [hwMode, setHwMode] = useState<'auto' | 'videotoolbox' | 'nvenc' | 'amf'>('auto')

  useEffect(() => {
    window.api
      ?.detectEncoders?.()
      .then((encs) => setHwAvailable(encs ?? []))
      .catch(() => {})
    window.api
      ?.getConfig?.()
      .then((cfg) => {
        if (cfg?.hwAccel?.mode) setHwMode(cfg.hwAccel.mode)
      })
      .catch(() => {})
  }, [])

  const saveHwMode = (mode: typeof hwMode): void => {
    setHwMode(mode)
    window.api?.setConfig?.({ hwAccel: { mode } }).catch(() => {})
  }

  const hwOptions: Array<{ value: string; label: string }> = [
    { value: 'auto', label: 'Otomatis (CPU)' },
    ...(hwAvailable.includes('videotoolbox')
      ? [{ value: 'videotoolbox', label: 'Apple VideoToolbox (Mac)' }]
      : []),
    ...(hwAvailable.includes('nvenc') ? [{ value: 'nvenc', label: 'NVIDIA NVENC' }] : []),
    ...(hwAvailable.includes('amf') ? [{ value: 'amf', label: 'AMD AMF' }] : [])
  ]
  const effectiveHwMode =
    hwAvailable.includes(hwMode as 'videotoolbox' | 'nvenc' | 'amf') || hwMode === 'auto'
      ? hwMode
      : 'auto'

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
            <FloatingSelect
              label="Kualitas"
              icon={<MonitorDown className="h-4 w-4" />}
              value={String(settings.maxHeight)}
              options={QUALITY_OPTIONS}
              onChange={(v) => set({ maxHeight: Number(v) })}
            />
            <FloatingSelect
              label="Cookies Browser"
              icon={<Globe className="h-4 w-4" />}
              value={settings.cookiesBrowser}
              options={BROWSER_OPTIONS}
              onChange={(v) => set({ cookiesBrowser: v })}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <Toggle
              checked={settings.parallel}
              onChange={(v) => set({ parallel: v })}
              label="Unduh 2 sekaligus"
              hint="Lebih cepat untuk banyak tautan."
            />
          </div>

          <div className="flex flex-col gap-1">
            <FloatingTextarea
              label="Cookie Douyin (opsional)"
              icon={<KeyRound className="h-4 w-4" />}
              value={settings.douyinCookie}
              onChange={(e) => set({ douyinCookie: e.target.value })}
              helper="Khusus Douyin (anti-bot ketat, wajib cookie sesi). Cara ambil: buka douyin.com di Chrome → login → F12 → Application → Cookies → https://www.douyin.com → salin seluruh header Cookie. Disimpan lokal & dipakai yt-dlp."
            />
          </div>

          <ProxyManager />

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 px-4 py-3 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
                <MonitorUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">
                  Pemrosesan Hardware
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Percepat render (sampai 10x) via encoder GPU
                </p>
              </div>
            </div>
            <FloatingSelect
              label="Encoder Render"
              value={effectiveHwMode}
              options={hwOptions}
              onChange={(v) => saveHwMode(v as typeof hwMode)}
              helper={
                hwAvailable.length === 0
                  ? 'Encoder hardware tidak terdeteksi — memakai CPU (libx264).'
                  : 'Fallback otomatis ke CPU bila encoder GPU gagal.'
              }
            />
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
