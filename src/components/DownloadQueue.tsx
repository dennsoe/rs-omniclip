import { motion, type Variants } from 'motion/react'
import {
  DownloadCloud,
  Trash2,
  Loader2,
  PlayCircle,
  FolderOpen,
  Link as LinkIcon,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import type { DownloadProgress } from '@lib/types'
import { formatBytes, formatSpeed, formatEta } from '@lib/utils'

/** Variants: masuk spring halus, keluar tween cepat (agar AnimatePresence tidak menunda lama). */
const queueVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', bounce: 0.18, duration: 0.5 }
  },
  exit: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.22, ease: 'easeOut' } }
}

/**
 * Panel "Antrean Unduhan" — HANYA tampil di tab "Banyak Link".
 * Yang scroll = body tabel (header sticky), bukan halaman.
 * Animasi: panel masuk, baris masuk bertahap, progress bar halus,
 * shimmer saat mengunduh, dan pill status berpop saat berubah.
 */
export default function DownloadQueue({
  downloads,
  isDownloading,
  onClear,
  onPreview,
  onOpenFolder
}: {
  downloads: DownloadProgress[]
  isDownloading: boolean
  onClear: () => void
  onPreview: (dl: DownloadProgress) => void
  onOpenFolder: (path: string) => void
}): React.ReactElement {
  const done = downloads.filter((d) => d.status === 'success').length
  const failed = downloads.filter((d) => d.status === 'failed').length

  return (
    <motion.div
      variants={queueVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 min-h-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden flex flex-col relative z-10 transition-colors"
    >
      <div className="shrink-0 flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3 transition-colors dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-900/60 dark:text-blue-400">
          <DownloadCloud className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Antrean Unduhan</span>
        <span className="ml-auto text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {done} selesai · {failed} gagal
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

      {/* YANG SCROLL = BODY TABEL (header sticky), bukan halaman.
          Tinggi mengisi sisa ruang (flex-1 min-h-0) — konsisten dgn tabel Riwayat. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 backdrop-blur dark:bg-slate-900/95 dark:text-slate-500">
                Video
              </th>
              <th className="sticky top-0 z-10 hidden w-28 bg-slate-50/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 backdrop-blur sm:table-cell dark:bg-slate-900/95 dark:text-slate-500">
                Status
              </th>
              <th className="sticky top-0 z-10 w-20 bg-slate-50/95 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 backdrop-blur dark:bg-slate-900/95 dark:text-slate-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {downloads.map((dl, idx) => (
              <motion.tr
                key={dl.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.3, ease: 'easeOut' }}
                className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <td className="min-w-0 px-4 py-2.5 align-middle">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="group/thumb relative hidden min-[420px]:block h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                      {dl.status === 'success' && dl.thumbnail ? (
                        <>
                          <img
                            src={dl.thumbnail}
                            alt=""
                            className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover ring-1 ring-slate-100 dark:ring-slate-700"
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/0 transition-colors group-hover/thumb:bg-slate-900/40">
                            <PlayCircle className="h-4 w-4 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100" />
                          </span>
                        </>
                      ) : (
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-slate-100 dark:bg-slate-900/60 dark:text-blue-400 dark:ring-slate-700">
                          <LinkIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {dl.status === 'success' && dl.filePath ? (
                        <button
                          type="button"
                          onClick={() => onPreview(dl)}
                          title="Putar video"
                          className="block w-full truncate text-left text-sm font-medium text-slate-800 transition-colors hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
                        >
                          {dl.title || dl.url}
                        </button>
                      ) : (
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {dl.title || dl.url}
                        </p>
                      )}
                      {dl.title && dl.url !== dl.title && (
                        <p className="truncate text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {dl.url}
                        </p>
                      )}
                      {dl.description && dl.status === 'success' && (
                        <p className="line-clamp-2 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {dl.description}
                        </p>
                      )}
                      {dl.status === 'failed' && dl.error && (
                        <p className="truncate text-xs text-rose-500 dark:text-rose-400 mt-1 leading-snug" title={dl.error}>
                          {dl.error}
                        </p>
                      )}

                      {dl.status === 'downloading' && (
                        <>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="relative flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-900/60 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-600"
                                animate={{ width: `${Math.max(2, Math.min(100, dl.percent))}%` }}
                                transition={{ ease: 'easeOut', duration: 0.4 }}
                              />
                              {/* Kilau bergerak saat sedang mengunduh */}
                              <motion.span
                                aria-hidden
                                className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/40 to-transparent"
                                animate={{ x: ['-120%', '340%'] }}
                                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300 shrink-0 w-10 text-right">
                              {Math.round(dl.percent)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex-wrap">
                            {dl.phase === 'merging' && <span>Menggabungkan...</span>}
                            {dl.phase === 'retrying' && <span>Mencoba ulang...</span>}
                            {dl.speedBytesPerSec && dl.speedBytesPerSec > 0 && (
                              <span>{formatSpeed(dl.speedBytesPerSec)}</span>
                            )}
                            {dl.etaSeconds !== undefined && <span>± {formatEta(dl.etaSeconds)}</span>}
                            {dl.sizeBytes ? <span>{formatBytes(dl.sizeBytes)}</span> : null}
                          </div>
                        </>
                      )}
                      {/* status ringkas utk layar sempit (kolom Status disembunyikan <sm) */}
                      <p className="mt-1 text-[11px] font-medium sm:hidden">
                        {dl.status === 'downloading' ? (
                          <span className="text-blue-600 dark:text-blue-400">Mengunduh</span>
                        ) : dl.status === 'success' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Selesai</span>
                        ) : (
                          <span className="text-rose-500 dark:text-rose-400">Gagal</span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden w-28 sm:table-cell px-4 py-2.5 align-middle">
                  <div className="flex flex-col items-start gap-1.5">
                    {dl.status === 'downloading' && (
                      <motion.span
                        key="downloading"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.35, duration: 0.4 }}
                        className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-[11px] font-medium border border-blue-200/50 dark:border-blue-500/20"
                      >
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Mengunduh
                      </motion.span>
                    )}
                    {dl.status === 'success' && (
                      <motion.span
                        key="success"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.35, duration: 0.4 }}
                        className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Selesai
                      </motion.span>
                    )}
                    {dl.status === 'failed' && (
                      <motion.span
                        key="failed"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.35, duration: 0.4 }}
                        className="flex items-center gap-1.5 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      >
                        <XCircle className="w-3 h-3" />
                        Gagal
                      </motion.span>
                    )}
                  </div>
                </td>
                <td className="w-20 px-4 py-2.5 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    {dl.status === 'success' && dl.filePath && (
                      <>
                        <button
                          type="button"
                          onClick={() => onPreview(dl)}
                          title="Putar video"
                          aria-label="Putar video"
                          className="p-2 rounded-lg text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenFolder(dl.filePath ?? '')}
                          title="Buka di folder"
                          aria-label="Buka di folder"
                          className="p-2 rounded-lg text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
