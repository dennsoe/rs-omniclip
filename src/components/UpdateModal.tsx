import { AnimatePresence, motion } from 'motion/react'
import { DownloadCloud, XCircle } from 'lucide-react'
import type { UpdateInfo } from '@lib/types'
import Markdown from './Markdown'

/**
 * Modal notifikasi update — muncul SEKALI PER SESI saat ada versi baru
 * (`hasUpdate === true`). Mengikuti pola modal lain (ConfirmModal):
 * overlay + panel `motion`, exit animation halus via AnimatePresence,
 * z-70, rounded-2xl, tema light/dark.
 *
 * "Unduh Sekarang" → membuka halaman rilis GitHub (strategi unduh manual,
 * gratis — app macOS tanpa Developer ID tidak bisa auto-install).
 * "Nanti" → menutup modal (muncul lagi di sesi/launch berikutnya).
 */
export default function UpdateModal({
  open,
  info,
  onClose,
  onDownload
}: {
  open: boolean
  info: UpdateInfo | null
  onClose: () => void
  onDownload: () => void
}): React.ReactElement {
  return (
    <AnimatePresence>
      {open && info && info.hasUpdate && (
        <motion.div
          key="update"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 transition-colors"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-w-md w-full relative shadow-2xl flex flex-col transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — ikon badge + judul + subjudul + tombol tutup */}
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div className="p-2 bg-blue-50 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 transition-colors">
                <DownloadCloud className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                  Versi Baru Tersedia
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  RS OmniTools v{info.current} → v{info.latest}
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

            {/* Body — catatan rilis (markdown) */}
            {info.notes && (
              <div className="max-h-56 overflow-y-auto px-5 py-4 pr-3">
                <Markdown>{info.notes}</Markdown>
              </div>
            )}

            {/* Footer — tombol aksi rounded-full */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full font-medium text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-95"
              >
                <DownloadCloud className="w-4 h-4" />
                Unduh Sekarang
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
