import { motion, type Variants } from 'motion/react'
import { DownloadCloud, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { DownloadProgress } from '@lib/types'
import { formatSpeed } from '@lib/utils'

/** Variants: masuk spring halus, keluar tween cepat agar tidak menunda AnimatePresence. */
const progressVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', bounce: 0.2, duration: 0.45 }
  },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2, ease: 'easeOut' } }
}

/**
 * Komponen progres unduhan KHUSUS tab "Akun / Halaman" — kompak, berbeda dari
 * panel "Antrean Unduhan" (tab Banyak Link) tapi dengan bahasa desain yang sama:
 * progress bar biru + shimmer, tombol Bersihkan, dan daftar item yang aktif.
 * Hanya menerima unduhan ber-`source === 'scrape'` (difilter di parent).
 */
export default function ScrapeDownloadProgress({
  downloads,
  isDownloading,
  onClear
}: {
  downloads: DownloadProgress[]
  isDownloading: boolean
  onClear: () => void
}): React.ReactElement {
  const total = downloads.length
  const done = downloads.filter((d) => d.status === 'success' || d.status === 'failed').length
  const success = downloads.filter((d) => d.status === 'success').length
  const failed = downloads.filter((d) => d.status === 'failed').length
  const active = downloads.filter((d) => d.status === 'downloading')
  const pct = total ? Math.round(downloads.reduce((a, d) => a + (d.percent ?? 0), 0) / total) : 0

  return (
    <motion.div
      variants={progressVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-3 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {isDownloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          ) : (
            <DownloadCloud className="h-3.5 w-3.5 text-blue-500" />
          )}
          Mengunduh {done}/{total}
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={isDownloading}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Bersihkan
        </button>
      </div>

      <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-600"
          animate={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
        />
        {isDownloading && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ['-120%', '340%'] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Daftar item yang sedang mengunduh — konsisten dgn baris antrean Banyak Link */}
      {active.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1 max-h-36 overflow-y-auto">
          {active.map((dl) => (
            <div
              key={dl.id}
              className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 min-w-0"
            >
              <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />
              <span className="truncate flex-1">{dl.title || dl.url}</span>
              {dl.speedBytesPerSec && dl.speedBytesPerSec > 0 && (
                <span className="shrink-0 tabular-nums">{formatSpeed(dl.speedBytesPerSec)}</span>
              )}
              <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
                {Math.round(dl.percent)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {done > 0 && (
        <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex-wrap">
          {success > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {success} selesai
            </span>
          )}
          {failed > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-500" />
              {failed} gagal
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}
