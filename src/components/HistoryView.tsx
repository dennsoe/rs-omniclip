import { AnimatePresence, motion } from 'motion/react'
import { History as HistoryIcon, Play, Trash2 } from 'lucide-react'
import type { HistoryEntry } from '@lib/types'
import { guessPlatform } from '@lib/utils'

/**
 * Tab "Riwayat" — daftar unduhan yang berhasil (persist di main process).
 * Setiap baris bisa diputar langsung (preview inline via media://).
 */
export default function HistoryView({
  history,
  onPreview,
  onClear
}: {
  history: HistoryEntry[]
  onPreview: (entry: HistoryEntry) => void
  onClear: () => void
}): React.ReactElement {
  return (
    <div className="h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden flex flex-col relative z-10 transition-colors">
      <div className="shrink-0 flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3 transition-colors dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-900/60 dark:text-blue-400">
          <HistoryIcon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Riwayat Unduhan</span>
        <span className="ml-auto text-[11px] font-medium text-slate-400 dark:text-slate-500">{history.length} item</span>
      </div>

      <AnimatePresence mode="wait">
      {history.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-slate-400 dark:text-slate-500"
        >
          <HistoryIcon className="w-8 h-8" />
          <p className="text-xs">Belum ada riwayat unduhan.</p>
        </motion.div>
      ) : (
        <motion.div
          key="table"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex flex-1 flex-col min-h-0"
        >
          {/* Tabel asli super responsif: table-fixed + truncate per kolom.
              YANG SCROLL = BODY TABEL (header sticky), bukan halaman.
              Tinggi mengisi sisa ruang (flex-1 min-h-0) — halaman TIDAK scroll. */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/95 dark:border-slate-700 dark:bg-slate-900/95">
                  <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 backdrop-blur dark:bg-slate-900/95 dark:text-slate-500">
                    Video
                  </th>
                  <th className="sticky top-0 z-10 hidden w-44 bg-slate-50/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 backdrop-blur sm:table-cell dark:bg-slate-900/95 dark:text-slate-500">
                    Platform · Waktu
                  </th>
                  <th className="sticky top-0 z-10 w-16 bg-slate-50/95 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 backdrop-blur dark:bg-slate-900/95 dark:text-slate-500">
                    Aksi
                  </th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {history.map((h) => (
                <tr
                  key={`${h.filePath}-${h.ts}`}
                  className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
                >
                  <td className="min-w-0 px-4 py-2.5 align-middle">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="group/thumb relative hidden min-[420px]:block h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                        {h.thumbnail ? (
                          <>
                            <img
                              src={h.thumbnail}
                              alt=""
                              className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover ring-1 ring-slate-100 dark:ring-slate-700"
                            />
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/0 transition-colors group-hover/thumb:bg-slate-900/40">
                              <Play className="h-4 w-4 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100" />
                            </span>
                          </>
                        ) : (
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-slate-100 dark:bg-slate-900/60 dark:text-blue-400 dark:ring-slate-700">
                            <Play className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                          {h.title || h.url}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500 sm:hidden">
                          {h.platform || guessPlatform(h.url)} ·{' '}
                          {new Date(h.ts).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="min-w-0 w-44 px-4 py-2.5 align-middle sm:table-cell hidden">
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {h.platform || guessPlatform(h.url)} ·{' '}
                      {new Date(h.ts).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </td>
                  <td className="w-16 px-4 py-2.5 align-middle">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPreview(h)
                        }}
                        title="Putar video"
                        aria-label="Putar video"
                        className="p-2 rounded-lg text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-700 p-3 flex justify-end">
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Bersihkan Riwayat
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
