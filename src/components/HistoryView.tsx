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
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden flex flex-col relative z-10 transition-colors">
      <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 p-3 flex items-center transition-colors">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 pl-2">Riwayat Unduhan</span>
        <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500 pr-2">
          {history.length} item
        </span>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400 dark:text-slate-500">
          <HistoryIcon className="w-8 h-8" />
          <p className="text-xs">Belum ada riwayat unduhan.</p>
        </div>
      ) : (
        <>
          <div className="overflow-y-auto max-h-[50vh] p-0">
            {history.map((h) => (
              <div
                key={`${h.filePath}-${h.ts}`}
                className="relative border-b border-slate-100 dark:border-slate-700/50 last:border-0 p-3 sm:p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  {h.thumbnail ? (
                    <img
                      src={h.thumbnail}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover shrink-0 bg-slate-100 dark:bg-slate-900/60"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center bg-blue-50 dark:bg-slate-900/60 text-blue-600 dark:text-blue-400">
                      <Play className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {h.title || h.url}
                    </p>
                    <p className="truncate text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {h.platform || guessPlatform(h.url)} ·{' '}
                      {new Date(h.ts).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onPreview(h)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Putar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 dark:border-slate-700 p-3 flex justify-end">
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Bersihkan Riwayat
            </button>
          </div>
        </>
      )}
    </div>
  )
}
